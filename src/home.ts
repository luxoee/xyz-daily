import "./styles.css";

const params = new URLSearchParams(window.location.search);
const encrypted = params.get("p");
if (encrypted) {
  const url = new URL("/keria/", window.location.origin);
  url.searchParams.set("p", encrypted);
  window.location.replace(url.toString());
}
