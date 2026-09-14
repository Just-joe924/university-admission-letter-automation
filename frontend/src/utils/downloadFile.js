// Stored PDFs live on another origin (Supabase storage), where the `download`
// attribute on a plain link is ignored; fetch as a blob to force a real download.
export const downloadFileFromUrl = async (fileUrl, fileName) => {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  const url = window.URL.createObjectURL(
    new Blob([blob], { type: "application/pdf" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
