class WebRenderer {
    renderUserContent(userInput: string): void {
        let element = document.createElement('div');
        element.innerHTML = userInput;
        document.body.appendChild(element);
    }
    
    displayMessage(message: string): void {
        document.write("<div>" + message + "</div>");
    }
    
    executeUserScript(script: string): void {
        eval(script);
    }
}

const renderer = new WebRenderer();
renderer.renderUserContent('<script>alert("XSS")</script>');