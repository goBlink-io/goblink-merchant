(function () {
  var script = document.currentScript;
  if (!script) return;

  var merchant = script.getAttribute("data-merchant") || "";
  var amount = script.getAttribute("data-amount") || "";
  var currency = script.getAttribute("data-currency") || "USD";
  var label = script.getAttribute("data-label") || "Pay with Crypto";
  var style = script.getAttribute("data-style") || "primary";

  var bg = style === "dark" ? "#27272a" : "#2563eb";

  var link = document.createElement("a");
  link.href =
    "https://merchant.goblink.io/pay/new?merchant=" +
    encodeURIComponent(merchant) +
    "&amount=" +
    encodeURIComponent(amount) +
    "&currency=" +
    encodeURIComponent(currency);
  link.textContent = label;
  link.style.cssText =
    "display:inline-block;padding:12px 24px;background:" +
    bg +
    ";color:white;border-radius:8px;text-decoration:none;font-family:sans-serif;font-weight:600;font-size:14px;";

  script.parentNode.insertBefore(link, script.nextSibling);
})();
