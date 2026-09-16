// One place for the funnel API base. Every page that posts a lead or a booking reads window.RR_API.
// Local dev talks to the laptop; the live site talks to the hosted funnel service.
(function(){
  var h = window.location.hostname;
  window.RR_API = (h === 'localhost' || h === '127.0.0.1')
    ? 'http://localhost:5055'
    : 'https://vsnet-scroll-medication-hawaiian.trycloudflare.com';   // active tunnel (switch to Railway once railway login is run)
})();
