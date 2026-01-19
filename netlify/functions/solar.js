exports.handler = async function(event, context) {
    // Standard CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const payload = JSON.parse(event.body);
        const { username, password } = payload;

        // --- 🔒 CONFIGURATION 🔒 ---
        const VALID_USER = "admin";       
        const VALID_PASS = "solar123";    
        const API_TOKEN = "YOUR_FIXED_TOKEN_HERE"; // <--- PASTE YOUR TOKEN HERE
        // ---------------------------

        if (username !== VALID_USER || password !== VALID_PASS) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong credentials" }) };
        }

        // --- PARALLEL API CALLS ---
        // We call both endpoints at the same time to be fast
        const v1_PlantList = "https://openapi.growatt.com/v1/plant/list";
        const v4_DeviceList = "https://openapi.growatt.com/v4/new-api/queryDeviceList";

        // 1. Prepare V4 Params (x-www-form-urlencoded)
        const v4Params = new URLSearchParams();
        v4Params.append('page', '1');
        v4Params.append('pagesize', '50');

        // 2. Execute both Fetch requests
        const [plantRes, deviceRes] = await Promise.all([
            // Request A: Get Power Totals (V1)
            fetch(v1_PlantList, {
                method: 'GET',
                headers: { 'token': API_TOKEN }
            }),
            // Request B: Get Device Inventory (V4)
            fetch(v4_DeviceList, {
                method: 'POST',
                headers: { 'token': API_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: v4Params
            })
        ]);

        // 3. Process Responses
        const plantData = await plantRes.json();
        const deviceText = await deviceRes.text(); // Parse text first to be safe
        const deviceData = JSON.parse(deviceText);

        // 4. Construct the Combined Data Package
        const combinedResult = {
            // Extract Plant Summary (Power, Energy, Money)
            summary: (plantData.data && plantData.data[0]) ? {
                name: plantData.data[0].plant_name || "Solar Plant",
                currentPower: plantData.data[0].pac || plantData.data[0].current_power || 0, // Watts
                dailyEnergy: plantData.data[0].e_today || plantData.data[0].today_energy || 0, // kWh
                totalEnergy: plantData.data[0].total_energy || 0, // kWh
                revenue: plantData.data[0].total_money || 0, // Currency
                status: (plantData.data[0].pac > 0) ? "online" : "offline"
            } : null,

            // Extract Device List (Inverters, Dataloggers)
            devices: (deviceData.data && deviceData.data.data) ? deviceData.data.data : []
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: combinedResult })
        };

    } catch (error) {
        console.error("Backend Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};