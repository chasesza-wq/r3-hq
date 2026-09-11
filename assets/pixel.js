/* RecoverRevenue — Meta pixel + conversion events.
   One file, included by index.html, start/index.html and book.html, so the
   pixel ID lives in exactly one place.

   PASTE THE PIXEL ID ON THE NEXT LINE. Until it is filled in, this file loads
   nothing and fires nothing — it fails silent and visible in the console
   rather than sending events to a pixel that does not exist. */
var META_PIXEL_ID = "1444076537632012";   /* <-- Events Manager -> Data sources -> your pixel */

(function () {
  "use strict";

  if (!META_PIXEL_ID) {
    console.warn("[RR] META_PIXEL_ID is empty — no pixel loaded, no events sent. " +
                 "Set it in assets/pixel.js.");
    return;
  }

  /* ---- Meta base code ---- */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');

  /* ---- which channel sent them, carried onto the event ---- */
  var q = new URLSearchParams(window.location.search);
  function utm(k, d) { return q.get(k) || d; }
  var attribution = {
    source:   utm("utm_source", "direct"),
    medium:   utm("utm_medium", "none"),
    campaign: utm("utm_campaign", "none")
  };

  /* ---- the conversion that matters: a real Calendly booking ----
     Calendly's inline widget posts a message when the visitor actually
     completes a booking. Tracking a button click instead would optimise the
     campaign toward people who open the calendar and leave. */
  window.addEventListener("message", function (e) {
    if (String(e.origin).indexOf("calendly.com") === -1) return;
    var d = e.data;
    if (!d || typeof d.event !== "string") return;

    if (d.event === "calendly.event_scheduled") {
      fbq('track', 'Schedule', {
        content_name: "15-minute call",
        source:   attribution.source,
        medium:   attribution.medium,
        campaign: attribution.campaign
      });
      console.log("[RR] Schedule fired", attribution);
    }
  });

  /* ---- book.html: the written-audit path is a Lead, not a Schedule ---- */
  window.rrTrackAuditLead = function () {
    fbq('track', 'Lead', {
      content_name: "written leak audit",
      source:   attribution.source,
      medium:   attribution.medium,
      campaign: attribution.campaign
    });
  };
})();
