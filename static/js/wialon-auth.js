let wialonToken = '';

function initiateWialonAuth() {
    const dns = "https://hosting.wialon.com";
    let url = dns + "/login.html";
    url += "?client_id=" + "QuamtumEVA";  // Reemplaza "QuamtumEVA" con el nombre de tu aplicación
    url += "&access_type=" + 0x100;
    url += "&activation_time=" + 0;
    url += "&duration=" + 604800;
    url += "&flags=" + 0x1;
    url += "&redirect_uri=" + dns + "/post_token.html";

    window.addEventListener("message", handleWialonToken);
    window.open(url, "_blank", "width=760, height=500, top=300, left=500");
}

function handleWialonToken(event) {
    const msg = event.data;
    if (typeof msg == "string" && msg.indexOf("access_token=") >= 0) {
        wialonToken = msg.replace("access_token=", "");
        console.log("Wialon token obtained:", wialonToken);
        
        window.removeEventListener("message", handleWialonToken);
        
        document.getElementById('wialon_token').value = wialonToken;
        document.getElementById('tokenDisplay').textContent = wialonToken;
        document.getElementById('loginButton').disabled = true;
        
        // Iniciar sesión en Wialon
        initWialonSession(wialonToken);
    }
}

function initWialonSession(token) {
    wialon.core.Session.getInstance().initSession("https://hst-api.wialon.com");
    wialon.core.Session.getInstance().loginToken(token, "", function(code) {
        if (code) {
            console.error("Error de Wialon:", wialon.core.Errors.getErrorText(code));
            alert("Error al iniciar sesión en Wialon");
        } else {
            const user = wialon.core.Session.getInstance().getCurrUser().getName();
            alert("Autorizado como " + user);
            sendLoginForm();
        }
    });
}

function sendLoginForm() {
    const form = document.getElementById('loginForm');
    const formData = new FormData(form);

    fetch('/login', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirect;
        } else {
            alert(data.error);
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert("Ocurrió un error durante el inicio de sesión");
    });
}

function logout() {
    const sess = wialon.core.Session.getInstance();
    if (sess && sess.getId()) {
        sess.logout(function() {
            document.getElementById('loginButton').disabled = false;
            document.getElementById('tokenDisplay').textContent = '';
            wialonToken = '';
        });
    }
}

window.initiateWialonAuth = initiateWialonAuth;
window.logout = logout;