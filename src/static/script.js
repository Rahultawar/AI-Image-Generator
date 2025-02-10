document.addEventListener("DOMContentLoaded", () => {
    const promptInput = document.getElementById("prompt");
    const loading = document.getElementById("loading");
    const imageElement = document.getElementById("generatedImage");
    const container = document.querySelector(".container");
    const heading = document.querySelector("h2");
    const generateBtn = document.querySelector("button");
    const generatedImageSection = document.getElementById("generated_image");
    const downloadLink = document.getElementById("downloadLink");

    // Move UI elements to bottom and hide heading
    const moveElementsToBottom = () => {
        heading.classList.add("move-bottom");
        container.classList.add("move-bottom");
        heading.style.display = "none"; // Hide the heading
    };

    // Toggle loading spinner and disable/enable the button
    const showLoading = (isLoading) => {
        loading.style.display = isLoading ? "block" : "none";
        generateBtn.disabled = isLoading;
        generateBtn.style.opacity = isLoading ? "0.5" : "1";
        generateBtn.style.cursor = isLoading ? "not-allowed" : "pointer";

        // Clear previous image while loading a new one
        if (isLoading) {
            imageElement.src = "";
            generatedImageSection.style.display = "none";
        }
    };

    // Display temporary messages (success/error)
    const showMessage = (message, type) => {
        const msgBox = document.createElement("div");
        msgBox.textContent = message;
        msgBox.className = `message-box ${type}`;
        document.body.appendChild(msgBox);

        setTimeout(() => {
            msgBox.style.opacity = "0";
            setTimeout(() => msgBox.remove(), 300);
        }, 2000);
    };

    // Generate AI Image and handle response
    const generateImage = async () => {
        const userPrompt = promptInput.value.trim();

        if (!userPrompt) {
            showMessage("⚠️ Please enter a prompt!", "error");
            return;
        }

        moveElementsToBottom(); // Adjust UI for image generation
        showLoading(true); // Show loading spinner

        try {
            const response = await fetch("/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: userPrompt }),
            });

            const data = await response.json();

            if (data.status === "success" && data.image_url) {
                // Set the image and download link
                imageElement.src = data.image_url;
                downloadLink.href = data.image_url;

                generatedImageSection.style.display = "block"; // Show image section
                showMessage("✅ Image generated successfully!", "success");
            } else {
                console.error("Error:", data.message || "No image URL returned.");
                showMessage("❌ Image generation failed!", "error");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            showMessage("❌ Error fetching image!", "error");
        } finally {
            showLoading(false); // Hide loading spinner
        }
    };

    window.generateImage = generateImage; // Attach function to global scope
});
