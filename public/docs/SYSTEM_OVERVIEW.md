# Visão Geral do Sistema ClockWise

Este documento descreve o fluxo de dados e a arquitetura do sistema de ponto eletrônico ClockWise, desde a marcação no dispositivo físico até a visualização no painel administrativo.

## Fluxograma de Comunicação

O sistema é composto por 3 partes principais que se comunicam em uma sequência específica:

**Dispositivo Físico (Relógio) -> Listener (Serviço Node.js) -> Aplicação ClockWise (Painel Web)**

---

### Etapa 1: Dispositivo Físico (Relógio de Ponto)

Esta é a origem de todos os dados de ponto.

-   **Ação do Usuário:** Um funcionário realiza uma marcação (ex: reconhecimento facial).
-   **Comunicação:** O dispositivo envia imediatamente os dados do registro via **WebSocket**.
-   **Destino:** A mensagem é enviada para o endereço de IP e porta do `Listener`.

#### **Configuração Crítica no Dispositivo:**
-   **IP do Servidor:** Deve ser o endereço de IP local do computador que está executando o `Listener` (o serviço `npm run start-ws`). Geralmente, um IP que começa com `192.168.x.x`.
-   **Porta do Servidor:** `7788` (ou a porta configurada no `listener`).
-   **Domínio:** Deixar em branco. A comunicação é por IP direto.

---

### Etapa 2: Listener (Ponte de Comunicação)

Este é um serviço Node.js que atua como um tradutor e intermediário. Ele é a única parte do sistema que "conversa" diretamente com o hardware.

-   **Como Iniciar:** Execute o comando `npm run start-ws` em um terminal separado.
-   **Função Principal:**
    1.  **Ouvir:** Fica constantemente aguardando por conexões WebSocket de dispositivos na porta `7788`.
    2.  **Receber:** Aceita a mensagem bruta do relógio.
    3.  **Traduzir e Encaminhar:** Formata a mensagem recebida em um JSON padronizado e a envia através de uma requisição **HTTP POST** para a API interna da aplicação ClockWise.

-   **Depuração:** O terminal onde o `listener` está rodando é a **ferramenta de diagnóstico mais importante**. Ele mostrará:
    -   Quando um dispositivo se conecta.
    -   A "mensagem bruta" exata recebida do dispositivo.
    -   Se o encaminhamento para a API foi bem-sucedido ou falhou.

*Arquivo principal: `src/websocket-listener/server.ts`*

---

### Etapa 3: Aplicação ClockWise (Painel Web)

Esta é a aplicação Next.js/React que você utiliza no seu navegador. Ela contém a inteligência de negócio e a interface do usuário.

-   **Como Iniciar:** Execute o comando `npm run dev`.

#### **Componentes Chave:**

1.  **API de Eventos de Ponto (`/api/v1/clock-events/route.ts`)**
    -   **Função:** É um ponto de entrada seguro que só aceita requisições do `Listener`.
    -   **Inteligência:** Ao receber um registro de ponto, esta API executa a lógica de negócio:
        -   Valida os dados e a chave de API (`X-API-Key`).
        -   Identifica o funcionário pelo ID.
        -   Busca o horário de trabalho associado a esse funcionário.
        -   Analisa a jornada do dia (início, fim, almoço, folga) para classificar o ponto corretamente (`Entrada`, `SaídaAlmoco`, etc.).
        -   Salva o registro de ponto processado no "banco de dados" em memória.
    -   **Depuração:** O terminal onde o `npm run dev` está rodando mostrará logs quando a API salvar um novo ponto.

2.  **Páginas da Interface (Ex: `/dashboard/timesheets`)**
    -   **Função:** Leem os dados que foram salvos pela API e os apresentam de forma organizada para o usuário.
    -   **Interação:** Permite visualizar, editar (em alguns casos) e gerar relatórios a partir dos dados de ponto.

---

### Resumo do Fluxo

1.  **Marcação:** Funcionário registra o ponto no relógio.
2.  **Envio:** Relógio envia dados via WebSocket para o `Listener` na porta `7788`.
3.  **Recepção e Encaminhamento:** `Listener` recebe, formata e envia os dados via HTTP POST para a `API` do ClockWise.
4.  **Processamento e Armazenamento:** `API` do ClockWise recebe do listener, aplica a lógica de negócio (horários, jornada) e salva o ponto.
5.  **Visualização:** O usuário acessa a "Folha de Ponto" no navegador, que exibe os dados salvos.
