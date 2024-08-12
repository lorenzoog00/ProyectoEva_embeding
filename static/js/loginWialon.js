let wialonSession = null;

export function initWialon() {
    return new Promise((resolve, reject) => {
        if (typeof wialon === "undefined") {
            console.error("La librería de Wialon no está cargada.");
            reject(new Error("Wialon library not loaded"));
            return;
        }

        wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com");
        wialon.core.Session.getInstance().loginToken("41454459d97f26fb5c2f8815b477a754E81C491AFBF55933401921DC7E6A6E6585318B0C", "", function (code) {
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