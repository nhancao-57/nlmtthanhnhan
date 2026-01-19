exports.handler = async function(event, context) {
    // 1. CORS Headers (Allows your website to talk to this function)
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body);
        const { username, password } = payload;

        // --- 🔒 CONFIGURATION SECTION 🔒 ---
        
        // 1. Set your Login Credentials
        const VALID_USER = "admin";       // Change this!
        const VALID_PASS = "ThanhNhan@1967";    // Change this!
        
        // 2. Set your Growatt Token
        const API_TOKEN = "709y2mp8451cylc04cq77bw2g83t006l"; 

        // -----------------------------------

        // Step 1: Check Credentials
        if (username !== VALID_USER || password !== VALID_PASS) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: "Wrong username or password" })
            };
        }

        // Step 2: Fetch Data from Growatt (Only happens if password is correct)
        const GROWATT_URL = "https://openapi.growatt.com/v1/plant/list"; 

        const response = await fetch(GROWATT_URL, {
            method: 'GET',
            headers: { 'token': API_TOKEN }
        });

        if (!response.ok) {
            return { statusCode: response.status, headers, body: `Growatt Error: ${response.statusText}` };
        }

        const data = await response.json();

        // Step 3: Return Data
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};