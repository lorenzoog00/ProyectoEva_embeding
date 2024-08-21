let wialonSession = null;

export function initWialon() {
    const token = window.wialonToken || localStorage.getItem('wialonToken');
    console.log("initWialon llamado con token:", token);
    
    return new Promise((resolve, reject) => {
        if (typeof wialon === "undefined") {
            console.error("La librería de Wialon no está cargada.");
            reject(new Error("Wialon library not loaded"));
            return;
        }

        if (!token) {
            console.error("No se encontró un token de Wialon.");
            reject(new Error("No Wialon token found"));
            return;
        }

        wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com");
        wialon.core.Session.getInstance().loginToken(token, "", function (code) {
            if (code) {
                console.error("Error de Wialon:", wialon.core.Errors.getErrorText(code));
                reject(new Error(wialon.core.Errors.getErrorText(code)));
            } else {
                console.log("Logged successfully to Wialon");
                wialonSession = wialon.core.Session.getInstance();
                resolve(wialonSession);
            }
        });
    });
}

export function getWialonSession() {
    return wialonSession;
}