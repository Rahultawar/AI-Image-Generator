document.addEventListener("DOMContentLoaded", function () {
    const promptInput = document.getElementById("prompt");
    const loading = document.getElementById("loading");
    const imageContainer = document.getElementById("generated_image");
    const imageResult = document.getElementById("image_result");
    const container = document.querySelector(".container");
    const heading = document.querySelector("h2");
    const generateBtn = document.querySelector("button");

    // Move elements to the bottom when generating an image
    function moveElementsToBottom() {
        heading.classList.add("move-bottom");
        container.classList.add("move-bottom");
    }

    // Handle Image Generation
    window.generateImage = async function () {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            showMessage("⚠️ Please enter a prompt!", "error");
            return;
        }

        moveElementsToBottom();
        showLoading(true);

        try {
            const response = await fetch("/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt }),
            });

            const data = await response.json();
            showLoading(false);

            if (data.status === "success") {
                imageContainer.style.opacity = "0";
                imageContainer.style.display = "block";
                setTimeout(() => (imageContainer.style.opacity = "1"), 100);
                imageResult.src = data.image_url;
            } else {
                showMessage("❌ Error: " + data.message, "error");
            }
        } catch (error) {
            showLoading(false);
            console.error("Error:", error);
            showMessage("❌ Failed to generate image. Please try again.", "error");
        }
    };

    // Function to show/hide the loading spinner and disable button
    function showLoading(isLoading) {
        loading.style.display = isLoading ? "block" : "none";
        generateBtn.disabled = isLoading;
        generateBtn.style.opacity = isLoading ? "0.5" : "1";
        generateBtn.style.cursor = isLoading ? "not-allowed" : "pointer";
    }

    function showMessage(message, type) {
        const msgBox = document.createElement("div");
        msgBox.textContent = message;
        msgBox.style.position = "fixed";
        msgBox.style.bottom = "20px";
        msgBox.style.left = "50%";
        msgBox.style.transform = "translateX(-50%)";
        msgBox.style.padding = "10px 20px";
        msgBox.style.color = "white";
        msgBox.style.borderRadius = "8px";
        msgBox.style.backgroundColor = type === "error" ? "#d9534f" : "#5cb85c";
        msgBox.style.boxShadow = "0px 4px 10px rgba(0, 0, 0, 0.3)";
        msgBox.style.zIndex = "1000";
        document.body.appendChild(msgBox);

        setTimeout(() => {
            msgBox.style.opacity = "0";
            setTimeout(() => msgBox.remove(), 300);
        }, 2000);
    }
});
