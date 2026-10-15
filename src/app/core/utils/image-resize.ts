/**
 * Reduz a imagem (maior lado = `maxSide`) e converte para JPEG com fundo branco, antes do envio ao storage.
 * Fotos de celular de vários MB viram poucas centenas de KB, sem perda visível nos cards e no PDV.
 */
export function resizeImageToJpeg(file: File, maxSide: number, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas indisponível.'));
        return;
      }
      // PNG transparente virou fundo preto ao converter para JPEG; pinta de branco antes.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Não foi possível converter a imagem.'));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler essa imagem.'));
    };
    img.src = objectUrl;
  });
}
