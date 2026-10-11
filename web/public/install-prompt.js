// Preserve Chrome's one-use event before React mounts on slow mobile connections.
window.addEventListener('beforeinstallprompt',function(event){event.preventDefault();window.nexoraInstallPrompt=event;});
window.addEventListener('appinstalled',function(){window.nexoraInstallPrompt=null;});
