const storeJWT = {}
const loginBtn = document.getElementById("loginform");
const btnResource = document.querySelector("#btnGetResource")
const formData = document.forms[0]

// Inserts the jwt to the store object
storeJWT.setJWT = function (data) {
    this.JWT = data
}

loginBtn.addEventListener("submit", async e => {
    e.preventDefault()

    const response = await fetch("/authenticate.php", {
        method: "POST",
        headers: {
            "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: JSON.stringify({
            username: formData.inputEmail.value,
            password: formData.inputPassword.value,
        }),
    })

    if (response.status >= 200 && response.status <= 299) {
        const jwt = await response.text()
        storeJWT.setJWT(jwt)
        frmLogin.style.display = "none"
        btnResource.style.display = "block"
    } else {
        // Handle errors
        console.log(response.status, response.statusText)
    }
})