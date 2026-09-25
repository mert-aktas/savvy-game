/**
 * The Savvy Game — analytics instrumentation (added 2026-09-25; the game ran untracked from 15 May).
 * GA4 only, same property as the site and the WOE games (G-EP331KDLPN). Every call fails safe.
 *
 * Levent's game code is NOT edited: this file wraps its global functions (next, reveal,
 * confirmScore, downloadCard, restart), which inline onclick handlers and answer() resolve by
 * name at call time, so the wrappers are picked up everywhere.
 *
 * Events (all carry game:'savvy' + variant en|pt-br|tr):
 *   game_start      first "Start the game" click
 *   step_complete   { step } after each answered scene (1..5)
 *   game_complete   { score10, tier } when the reveal screen shows
 *   score_confirm   { confirmed, low } "sounds about right" / "my users are different"
 *   consult_click   the consult booking button (only shown to confirmed low scores)
 *   share_download  share-card PNG download
 *   play_again
 *   cta_click       { link_url } outbound userguiding.com links ("Made by UserGuiding")
 */
(function () {
  var VARIANT = (location.pathname.match(/savvy-game\/([a-z-]+)\//) || [])[1] || 'en';

  function track(name, params) {
    try {
      if (typeof gtag === 'function') {
        var p = { game: 'savvy', variant: VARIANT };
        for (var k in (params || {})) p[k] = params[k];
        gtag('event', name, p);
      }
    } catch (e) { /* ignore */ }
  }
  window.savvyTrack = track;

  function wrap(name, before) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__savvyWrapped) return;
    var w = function () {
      try { before.apply(this, arguments); } catch (e) { /* ignore */ }
      return orig.apply(this, arguments);
    };
    w.__savvyWrapped = true;
    window[name] = w;
  }

  function stepNow() { try { return state.step; } catch (e) { return null; } }   // Levent's global `state`

  var started = false;
  function install() {
    wrap('next', function () {
      var s = stepNow();
      if (s === 0 && !started) { started = true; track('game_start'); }
      else if (s >= 1 && s <= 4) { track('step_complete', { step: s }); }
    });
    wrap('reveal', function () {
      track('step_complete', { step: 5 });
      // score is final once reveal runs; compute the same 0-10 value the game shows
      var s10 = null, tier = null;
      try { s10 = Math.round(state.score / 10); } catch (e) { /* ignore */ }
      if (s10 !== null) tier = s10 <= 3 ? 'guided_explorer' : s10 <= 5 ? 'casual_capable' : s10 <= 7 ? 'confident_operator' : 'power_user';
      track('game_complete', { score10: s10, tier: tier });
    });
    wrap('confirmScore', function (isCorrect) {
      var low = null;
      try { low = (state.score10 != null ? state.score10 : Math.round(state.score / 10)) < 6; } catch (e) { /* ignore */ }
      track('score_confirm', { confirmed: !!isCorrect, low: low });
    });
    wrap('downloadCard', function () { track('share_download'); });
    wrap('restart', function () { started = false; track('play_again'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();

  document.addEventListener('click', function (e) {
    var consult = e.target.closest && e.target.closest('#consult-cta .btn-primary');
    if (consult) { track('consult_click'); return; }
    var link = e.target.closest && e.target.closest('a[href*="userguiding.com"]:not([href*="games.userguiding.com"])');
    if (link) track('cta_click', { link_url: link.href });
  }, true);
})();
