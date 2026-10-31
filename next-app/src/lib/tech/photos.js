// Resize sequentially on the device to keep memory and upload size low.
export function compressRepairPhoto(file) {
  if (!file || !file.type.startsWith('image/')) return Promise.reject(new Error('Please take or choose an image.'));
  if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('This photo is too large. Take a smaller photo and try again.'));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), image = new Image();
    const fail = message => { URL.revokeObjectURL(url); reject(new Error(message)); };
    image.onerror = () => fail('This phone could not read the photo. Please retake it.');
    image.onload = () => {
      try {
        const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return fail('Unable to prepare the photo. Please try again.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('Unable to prepare this photo. Please retake it.'));
          resolve(new File([blob], 'repair.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.65);
      } catch { fail('Unable to prepare this photo. Please retake it.'); }
    };
    image.src = url;
  });
}
