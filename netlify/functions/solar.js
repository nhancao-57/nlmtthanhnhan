exports.handler = async function(event, context) {
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
        const API_TOKEN = "709y2mp8451cylc04cq77bw2g83t006lE"; // <--- PASTE YOUR TOKEN HERE
        // ---------------------------

        if (username !== VALID_USER || password !== VALID_PASS) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong credentials" }) };
        }

        // --- PARALLEL API CALLS ---
        const v1_PlantList = "https://openapi.growatt.com/v1/plant/list";
        const v4_DeviceList = "https://openapi.growatt.com/v4/new-api/queryDeviceList";

        const v4Params = new URLSearchParams();
        v4Params.append('page', '1');
        v4Params.append('pagesize', '50');

        // Execute both requests
        const [plantRes, deviceRes] = await Promise.all([
            fetch(v1_PlantList, {
                method: 'GET',
                headers: { 'token': API_TOKEN }
            }),
            fetch(v4_DeviceList, {
                method: 'POST',
                headers: { 'token': API_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: v4Params
            })
        ]);

        // --- 🛠️ FIXING THE DATA EXTRACTION 🛠️ ---
        
        // 1. Process V1 (Power Data)
        const plantJson = await plantRes.json();
        
        // We look for the plant object inside data.data.plants[0] OR data.data[0]
        let plantSummary = {};
        if (plantJson.data && plantJson.data.plants && plantJson.data.plants.length > 0) {
            // Correct Path based on your logs
            plantSummary = plantJson.data.plants[0];
        } else if (Array.isArray(plantJson.data) && plantJson.data.length > 0) {
            // Fallback Path
            plantSummary = plantJson.data[0];
        }

        // 2. Process V4 (Device List)
        const deviceText = await deviceRes.text();
        const deviceJson = JSON.parse(deviceText);
        // V4 usually hides the list inside data.data.data
        const deviceList = (deviceJson.data && deviceJson.data.data) ? deviceJson.data.data : [];


        // 3. Construct Final Package
        const combinedResult = {
            summary: {
                // Use safe navigation (?. || 0) to prevent crashes
                name: plantSummary.plant_name || plantSummary.name || "Solar Plant",
                currentPower: plantSummary.pac || plantSummary.current_power || 0,
                dailyEnergy: plantSummary.e_today || plantSummary.today_energy || 0,
                totalEnergy: plantSummary.total_energy || 0,
                status: (parseFloat(plantSummary.pac || 0) > 0) ? "online" : "offline"
            },
            devices: deviceList
        };

        // Debugging: Log what we found to Netlify Console
        console.log("Extracted Summary:", combinedResult.summary);

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