// Utility functions for Gemini Translator

function sanitizeFilename(name) {
    if (!name) return "Unknown";
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim() || "Unknown";
}

function setSmartTitle(opfDoc, title) {
    let dcTitle = opfDoc.getElementsByTagName("dc:title")[0] || opfDoc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "title")[0];
    if (dcTitle) {
        dcTitle.textContent = title;
    } else {
        const metadata = opfDoc.getElementsByTagName("metadata")[0];
        if (metadata) {
            const newTitle = opfDoc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:title");
            newTitle.textContent = title;
            metadata.appendChild(newTitle);
        }
    }
}

function forceNewIdentifier(opfDoc) {
    let identifier = opfDoc.getElementsByTagName("dc:identifier")[0] || opfDoc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "identifier")[0];
    const uuid = 'urn:uuid:' + crypto.randomUUID();
    
    if (identifier) {
        identifier.textContent = uuid;
    } else {
        const metadata = opfDoc.getElementsByTagName("metadata")[0];
        if (metadata) {
            const newId = opfDoc.createElementNS("http://purl.org/dc/elements/1.1/", "dc:identifier");
            newId.setAttribute("id", "uuid_id");
            newId.textContent = uuid;
            metadata.appendChild(newId);
        }
    }
}
