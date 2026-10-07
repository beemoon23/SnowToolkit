'use strict';
/* Atualização automática do SnowToolkit (GitHub). SN.checkUpdate(manual) é chamado na abertura e pela página Sobre. */
(function () {
  var SN = window.SN, busy = false;

  function apply(build) {
    SN.toast('Baixando a atualização... o programa vai fechar e abrir de novo sozinho.', 'ok', 8000);
    return SN.api.post('/api/update/apply', {}).then(function (r) {
      if (r.already) return SN.toast('Você já está com a versão mais recente.', 'ok');
      document.body.innerHTML = '<div style="padding:40px;font:16px sans-serif;color:#ccc">Atualizado' + (build ? ' (' + build + ')' : '') + '. O SnowToolkit está reabrindo... Se a janela não aparecer em alguns segundos, abra o programa de novo.</div>';
    }).catch(function (e) { SN.toast('Não consegui atualizar: ' + e.message, 'bad', 9000); });
  }

  SN.checkUpdate = function (manual) {
    if (busy) return Promise.resolve();
    busy = true;
    return SN.api.get('/api/update').then(function (d) {
      if (!d.canUpdate) {
        if (manual) SN.toast('Esta cópia não se atualiza sozinha (modo demo ou compilada fora do GitHub). Baixe a versão da aba Releases do GitHub uma vez; dali em diante é automático.', 'warn', 9000);
        return;
      }
      if (d.error) { if (manual) SN.toast('Não consegui verificar atualização: ' + d.error, 'bad', 7000); return; }
      if (!d.available) { if (manual) SN.toast('Você já está com a versão mais recente (' + d.build + ').', 'ok'); return; }
      return SN.confirm({ title: 'Atualização disponível', body: 'Tem uma versão nova do SnowToolkit (' + d.remote + '). Atualizar agora? O programa fecha e abre de novo sozinho.', ok: 'Atualizar' }).then(function (yes) { if (yes) return apply(d.remote); });
    }).catch(function (e) { if (manual) SN.toast('Não consegui verificar atualização: ' + e.message, 'bad'); }).then(function () { busy = false; });
  };
})();
