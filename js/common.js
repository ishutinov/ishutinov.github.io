window.onload = function() {
	//autoloader
};

function showChat() {
	if (document.getElementById("chatContainer").style.display == "block") {
		document.getElementById("chatContainer").style.display = "none";
	} else if (document.getElementById("chatContainer").style.display == "none") {
		document.getElementById("chatContainer").style.display = "block";
		document.getElementById("chatMsg").focus();
	} else {
		document.getElementById("chatContainer").style.display = "block";
		document.getElementById("chatMsg").focus();
	}
}
