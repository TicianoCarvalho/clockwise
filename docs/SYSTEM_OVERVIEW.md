# Protocolo WebSocket para Evo Facial v1.7

O protocolo WebSocket para Evo Facial versão 1.7 é um formato de comunicação entre o equipamento e o servidor baseado em JSON, que permite gerenciar usuários, logs, acessos e configurações do dispositivo de forma remota e flexível.

---

## Histórico de Diagnóstico e Correções (Sessão de Testes)

Este capítulo documenta o processo de depuração e as soluções implementadas durante os testes do sistema ClockWise.

### 1. Verificação do Status "Online" do Dispositivo

*   **Problema:** O status do dispositivo no painel de "Gerenciamento de Dispositivos" permanecia como "Offline", mesmo com o equipamento conectado.
*   **Diagnóstico:** A comunicação via WebSocket estava funcionando, mas a atualização do status no "banco de dados" (arquivo `devices.json`) estava falhando. A causa era uma camada de rede desnecessária e instável (`axios.patch`) dentro do listener do WebSocket.
*   **Solução:** O listener (`src/websocket-listener/server.ts`) foi modificado para chamar a função `updateDeviceLastSeen` diretamente, atualizando o arquivo `devices.json` de forma atômica e confiável, sem dependência de rede. Para fornecer feedback visual, foi adicionada uma animação de "pulsação" que é ativada brevemente após um comando de sincronização bem-sucedido.

### 2. Registros de Ponto Não Apareciam na Folha de Ponto

*   **Problema:** Marcações feitas no equipamento (via facial ou cartão) não eram exibidas na tela de "Folhas de Ponto", mesmo após clicar em "Buscar".
*   **Diagnóstico Final:** A causa raiz foi identificada na API de eventos de ponto (`src/app/api/v1/clock-events/route.ts`). A lógica para determinar o tipo de batida (`determinePunchType`) era excessivamente complexa e falhava ao processar registros de dias anteriores ou que não se encaixavam perfeitamente no horário. Além disso, uma comparação incorreta entre o `enrollid` (número) do dispositivo e o `id` (string) do funcionário no sistema impedia que o colaborador fosse encontrado.
*   **Solução Estrutural:**
    1.  A API foi refatorada para garantir que a busca do funcionário compare `string` com `string`, resolvendo a incompatibilidade de tipos.
    2.  A lógica `determinePunchType` foi drasticamente simplificada. Agora, ela se baseia apenas na ordem das marcações do dia (`1ª = Entrada`, `2ª = Saída Almoço`, etc.), garantindo que **todos** os registros sejam salvos, independentemente do horário ou da data.
    3.  Foi implementada uma atualização automática a cada 30 segundos na tela da Folha de Ponto (`TimesheetPanel.tsx`) para facilitar a verificação de novos registros sem a necessidade de clicar em "Buscar".

### 3. Edições Manuais na Folha de Ponto Eram Descartadas

*   **Problema:** Qualquer edição manual nos horários da folha de ponto era perdida após a atualização automática.
*   **Diagnóstico:** O componente `TimesheetPanel.tsx` usava um único estado para armazenar tanto os dados do servidor quanto as edições do formulário. A atualização automática sobrescrevia as alterações feitas pelo usuário.
*   **Solução:** O componente foi reestruturado para usar dois estados distintos: um para os dados originais do servidor e outro para os dados editados pelo usuário, prevenindo a perda de informações e corrigindo a lógica de salvamento para persistir as alterações corretamente.

---

## Análise de Tecnologia: Gemini vs. ML Kit para Reconhecimento Facial

Durante o desenvolvimento do módulo de ponto facial, foi levantada a questão sobre a viabilidade de migrar a tecnologia de verificação facial do Gemini para o ML Kit. Esta seção detalha a análise e a decisão arquitetural.

### Gemini API (Abordagem Atual)

*   **Prós:**
    *   **Precisão de Verificação:** Como um modelo de IA multimodal avançado, o Gemini oferece alta precisão na tarefa de *verificação* (comparar um rosto capturado com uma foto de referência), lidando bem com variações de iluminação, ângulo e expressão.
    *   **Segurança:** A lógica de comparação e os dados de referência residem no servidor, evitando a exposição de informações sensíveis no lado do cliente.
    *   **Manutenção:** O modelo é mantido e atualizado pelo Google, simplificando a evolução da tecnologia.
*   **Contras:**
    *   **Latência e Custo:** Cada registro de ponto requer uma chamada de API, incorrendo em custos e adicionando uma latência perceptível para o usuário final.
    *   **Dependência de Rede:** A funcionalidade é totalmente dependente de uma conexão de internet estável no dispositivo de ponto.

### ML Kit (Face Detection / Face Mesh)

*   **Prós:**
    *   **Velocidade e Custo:** O ML Kit opera diretamente no dispositivo, oferecendo detecção de rosto quase instantânea e sem custos de API.
    *   **Operação Offline:** A detecção facial funciona sem a necessidade de uma conexão com a internet.
*   **Contras:**
    *   **Foco em Detecção, Não em Verificação:** A principal função do ML Kit é *detectar* a presença e os contornos de um rosto, não *verificar* a identidade. A implementação de uma lógica de verificação robusta exigiria um passo adicional complexo, como a extração de embeddings faciais e a comparação com um banco de dados, o que anularia parte dos benefícios de performance.

### Decisão e Arquitetura Recomendada: Abordagem Híbrida

A análise concluiu que a abordagem mais robusta, segura e eficiente é um **modelo híbrido**, utilizando o melhor de cada tecnologia:

1.  **Detecção no Dispositivo com ML Kit:** O aplicativo usará o ML Kit para análise em tempo real do vídeo da câmera. Sua função é detectar rapidamente a presença de um rosto e garantir que ele esteja bem enquadrado e com qualidade suficiente para análise.
2.  **Verificação no Servidor com Gemini:** Somente após o ML Kit validar a presença de um rosto de boa qualidade, o quadro da imagem é capturado e enviado para o fluxo `verifyFace` do Gemini. O Gemini então realiza a verificação segura e precisa contra as fotos de referência armazenadas no banco de dados.

Esta abordagem otimiza a experiência do usuário, reduzindo a latência percebida e o número de chamadas de API (e, consequentemente, os custos), ao mesmo tempo em que mantém a camada crítica de verificação de identidade em um ambiente de servidor seguro.

---

## Detalhes do Protocolo Original

### Versões
- **1.0 (27/10/2022):** Versão inicial
- **1.2 (19/03/2023):** Adicionado comando `enableuser`
- **1.3 (24/01/2024):** Adicionado campo "SN" para todos os comandos
- **1.4 (08/11/2024):** Adicionado protocolo WebRTC para intercomunicação
- **1.5 (26/02/2025):** Adicionada detecção de veia palmar
- **1.6 (07/04/2025):** Adicionado comando `adduser`
- **1.7 (28/10/2025):** Interface atualizada para `Getuserinfo` e `Setuserinfo`

### Comandos Principais

#### Registro do equipamento (“reg”)
```json
{
  "cmd":"reg",
  "sn":"ABCD12345678",
  "devinfo": {
    "modelname":"AiFace",
    "usersize":5000,
    "facesize":5000,
    "time":"2024-12-31 00:00:00"
  }
}
```

#### Enviar logs ("sendlog")
```json
{
  "cmd": "sendlog",
  "sn": "ABCD12345678",
  "count": 2,
  "logindex": 10,
  "record": [
    {
      "enrollid": 1,
      "time": "2023-12-23 13:49:30",
      "verifymode": 13,
      "image": "base64imagem"
    }
  ]
}
```

#### Obter informações do usuário ("getuserinfo")
```json
{
  "cmd": "getuserinfo",
  "enrollid": 1,
  "backupnum": 50
}
```

#### Editar informações do usuário ("setuserinfo")
```json
{
  "cmd": "setuserinfo",
  "enrollid": 1,
  "name": "Fulano",
  "card": 125450,
  "pwd": 123456
}
```

... e outros comandos conforme o protocolo original.
