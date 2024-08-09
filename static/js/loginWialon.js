export function initWialon() {
    return new Promise((resolve, reject) => {
        try {
            wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com");
            wialon.core.Session.getInstance().loginToken("41454459d97f26fb5c2f8815b477a7540BCA916D521D71CFC64825C2F2C3132535C4FAA0", "", function (code) {
                if (code) {
                    console.error("Error de Wialon:", wialon.core.Errors.getErrorText(code));
                    reject(new Error(wialon.core.Errors.getErrorText(code)));
                } else {
                    console.log("Logged successfully to Wialon");
                    const wialonSession = wialon.core.Session.getInstance();
                    resolve(wialonSession);
                }
            });
        } catch (error) {
            console.error("Error al inicializar Wialon:", error);
            reject(error);
        }
    });
}