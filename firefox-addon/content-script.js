(async () => {
  const seen = new Set();
  const pdfs = [];
  const anchors = document.querySelectorAll("a[href]");

  for (const a of anchors) {
    try {
      const url = new URL(a.href, document.baseURI);
      if (url.pathname.toLowerCase().endsWith(".pdf") && !seen.has(url.href)) {
        seen.add(url.href);
        pdfs.push({
          url: url.href,
          filename: decodeURIComponent(url.pathname.split("/").pop()),
        });
      }
    } catch (e) {
      // Malformed href — skip
    }
  }

  let count = 0;
  for (const { url, filename } of pdfs) {
    try {
      const resp = await fetch(url, { credentials: "include" });
      if (!resp.ok) continue;
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      count++;
    } catch (e) {
      // CORS or network error — skip
    }
  }

  browser.runtime.sendMessage({ type: "pdf-count", count, total: pdfs.length });
})();
