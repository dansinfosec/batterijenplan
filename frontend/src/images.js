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
