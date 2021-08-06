function openLink () {
    var appWindow = window.open("ourapp://www.ourdomain.com/files/12345","_blank");
    setTimeout( function () {if (appWindow) {
        appWindow.location ="http://www.ourdomain.com/buyourapp";
            }
            },1000);
}