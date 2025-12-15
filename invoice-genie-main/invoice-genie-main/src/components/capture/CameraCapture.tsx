import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onCapture?: (imageData: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      toast({
        title: "Erro ao acessar câmera",
        description: "Permita o acesso à câmera nas configurações do navegador.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");
        setCapturedImage(imageData);
        stopCamera();
        onCapture?.(imageData);
      }
    }
  }, [onCapture]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        onCapture?.(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    setIsProcessing(true);
    // Simulating AI processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setIsComplete(true);
    toast({
      title: "Nota Fiscal Processada!",
      description:
        "Para leitura automática por IA, habilite o Lovable Cloud.",
    });
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setIsComplete(false);
    stopCamera();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-[4/3] bg-muted relative flex items-center justify-center">
            {isStreaming && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured invoice"
                className="w-full h-full object-contain"
              />
            )}

            {!isStreaming && !capturedImage && (
              <div className="text-center p-8">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Capture ou envie uma foto da Nota Fiscal
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                <div className="bg-card p-6 rounded-lg text-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
                  <p className="text-foreground font-medium">
                    Processando imagem...
                  </p>
                </div>
              </div>
            )}

            {isComplete && (
              <div className="absolute top-4 right-4">
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Processado</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {!capturedImage && !isStreaming && (
          <>
            <Button onClick={startCamera} className="flex-1">
              <Camera className="w-5 h-5 mr-2" />
              Abrir Câmera
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="w-5 h-5 mr-2" />
              Enviar Foto
            </Button>
          </>
        )}

        {isStreaming && (
          <>
            <Button onClick={capturePhoto} className="flex-1">
              <Camera className="w-5 h-5 mr-2" />
              Capturar
            </Button>
            <Button variant="outline" onClick={stopCamera}>
              <X className="w-5 h-5" />
            </Button>
          </>
        )}

        {capturedImage && !isProcessing && (
          <>
            <Button
              onClick={processImage}
              className="flex-1"
              disabled={isComplete}
            >
              {isComplete ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Concluído
                </>
              ) : (
                "Processar NF"
              )}
            </Button>
            <Button variant="outline" onClick={resetCapture}>
              <X className="w-5 h-5 mr-2" />
              Nova Foto
            </Button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
