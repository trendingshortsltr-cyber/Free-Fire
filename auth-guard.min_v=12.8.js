!function(){"use strict";
function getHomeUrl(){
    const p = window.location.pathname;
    if(p.includes('/user-dashboard') || p.includes('/user-free') || p.includes('/user-paid') || p.includes('/user-rankings') || p.includes('/user-signup') || p.includes('/user-login') || p.includes('/index/')){
        return '../index/index.html';
    }
    return 'index/index.html';
}
function getLoginUrl(){
    return getHomeUrl();
}
const t="playerSession";
function n(){try{const e=localStorage.getItem(t);if(!e)return null;const n=JSON.parse(e);return n&&n.token&&(delete n.token,localStorage.setItem(t,JSON.stringify(n))),n}catch(e){return console.error("Session parse error:",e),null}}
function r(){const e=n();return e?e.token:null}
function o(){return true;}
function a(){return true;}
window.AuthGuard={requireAuth:a,isAuthenticated:o,getSession:n,getToken:r,getPlayer:function(){const e=n();return e?e.player_data:null},getTeam:function(){const e=n();return e?e.team_data:null},logout:function(){localStorage.removeItem(t),sessionStorage.removeItem("returnUrl");window.location.href=getHomeUrl()},authFetch:function(n,o={}){const a=r();return o.credentials=o.credentials||"same-origin",a&&(o.headers||(o.headers={}),o.headers instanceof Headers?o.headers.set("Authorization","Bearer "+a):o.headers.Authorization="Bearer "+a),fetch(n,o)}};
}();