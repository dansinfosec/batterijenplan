// Perf: vraagt Cloudinary om een geoptimaliseerde variant (modern formaat,
// automatische kwaliteit, begrensde breedte) i.p.v. het originele bestand.
// Niet-Cloudinary URL's (bijv. lokale dev-media) worden ongemoeid gelaten.
export function optimizedImageUrl(url, width = 800) {
  if (
    !url ||
    !url.includes("res.cloudinary.com") ||
    !url.includes("/image/upload/")
  ) {
    return url;
  }
  // c_limit: nooit opschalen, alleen verkleinen als het origineel groter is.
  return url.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,w_${width},c_limit/`,
  );
}

// srcset-string met meerdere Cloudinary-breedtes voor de responsive cover op
// blogpost-pagina's. Geeft undefined voor niet-Cloudinary URL's, zodat React
// het srcset-attribuut dan gewoon weglaat.
export function coverSrcSet(url, widths = [480, 768, 960, 1200]) {
  if (
    !url ||
    !url.includes("res.cloudinary.com") ||
    !url.includes("/image/upload/")
  ) {
    return undefined;
  }
  return widths.map((w) => `${optimizedImageUrl(url, w)} ${w}w`).join(", ");
}
