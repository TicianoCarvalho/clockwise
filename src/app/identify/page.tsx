
"use client";

import { Suspense } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { IdentifyAndClockInContent } from "@/components/IdentifyAndClockInContent";


export default function IdentifyPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Button asChild variant="ghost" className="absolute left-4 top-4">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Home
        </Link>
      </Button>
      <Card className="w-full max-w-[380px]">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl pt-2">Registro de Ponto Facial</CardTitle>
          <CardDescription>Aproxime seu rosto da câmera para fazer o registro do seu ponto.</CardDescription>
        </CardHeader>
        <CardContent>
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <IdentifyAndClockInContent />
            </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
