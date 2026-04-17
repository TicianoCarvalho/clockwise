"use client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function BiReportPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Dados mock
  const lineData = [
    { mes: 'set/25', negativas: 120, extras: 40 },
    { mes: 'out/25', negativas: 150, extras: 50 },
    { mes: 'nov/25', negativas: 130, extras: 45 },
    { mes: 'dez/25', negativas: 170, extras: 60 },
    { mes: 'jan/26', negativas: 145, extras: 55 },
  ];

  const tipoData = [
    { tipo: 'Faltas', horas: 48 },
    { tipo: 'Atrasos', horas: 24 },
    { tipo: 'Saídas', horas: 15 },
    { tipo: 'Atestados', horas: 58 },
  ];

  const setorData = [
    { setor: 'TI', horas: 89 },
    { setor: 'Vendas', horas: 76 },
    { setor: 'RH', horas: 45 },
    { setor: 'Operacional', horas: 35 },
  ];

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const headerHeight = 22;

      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - headerHeight - margin;

      const canvasAspectRatio = canvas.width / canvas.height;
      
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / canvasAspectRatio;

      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * canvasAspectRatio;
      }
      
      const xOffset = (pdfWidth - imgWidth) / 2;
      const imgData = canvas.toDataURL('image/png');

      pdf.setFontSize(16);
      pdf.text('Análise Completa de Produtividade', pdfWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`Período: Janeiro 2026 | Empresa: Todos os Setores`, pdfWidth / 2, 18, { align: 'center' });

      pdf.addImage(imgData, 'PNG', xOffset, headerHeight, imgWidth, imgHeight);
      pdf.save(`relatorio_produtividade_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao gerar PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">📊 Relatórios BI</h1>

      <div ref={reportRef}>
        {/* Filtros (discretos, SEM tabs) */}
        <div className="flex gap-4 bg-gray-100 p-4 rounded">
          <select className="px-3 py-2 border rounded">
            <option>Últimos 6 meses</option>
          </select>
          <select className="px-3 py-2 border rounded">
            <option>Todos os setores</option>
          </select>
        </div>

        {/* 3 GRÁFICOS LADO A LADO */}
        <div className="mt-6 grid grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow">
          {/* Gráfico 1: Evolução (Linha) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="negativas" stroke="#ef4444" name="Horas Negativas" />
                  <Line type="monotone" dataKey="extras" stroke="#10b981" name="Horas Extras" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico 2: Por Tipo (Barras) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Horas Negativas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tipoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="horas" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico 3: Por Setor (Barras) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Horas por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={setorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="setor" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="horas" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Botão Export (rodapé) */}
      <div className="flex justify-end pt-6 border-t">
        <Button 
          onClick={handleExportPDF} 
          disabled={loading}
          size="lg"
          className="gap-2"
        >
          📄 {loading ? 'Gerando...' : 'Exportar PDF'}
        </Button>
      </div>
    </div>
  );
}