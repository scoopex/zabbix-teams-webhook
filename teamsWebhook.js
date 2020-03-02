var SEVERITY_COLORS = [
    "#97AAB3", // Not classified.
    "#7499FF", // Information.
    "#FFC859", // Warning.
    "#FFA059", // Average.
    "#E97659", // High.
    "#E45959", // Disaster.
    "#00ff00"  // Resolved.
];

var EVENT_STATUS = {
    PROBLEM: "PROBLEM",
    RESOLVED: "OK"
};

var params = JSON.parse(value),
    req = new CurlHttpRequest(),
    fields = {}
    ;

function isEventProblem(params) {
    return params.eventValue == 1 && params.eventUpdateStatus == 0;	
}

function isEventResolve(params) {
	return params.eventValue == 0;
}

function createProblemURL(zabbixURL, triggerID, eventID) {
    return zabbixURL.replace(/\/+$/, "") +
    "/tr_events.php?triggerid=" + triggerID +
    "&eventid=" + eventID;
}

function createGraphURL(zabbixURL, itemID) {
    return zabbixURL.replace(/\/+$/, "") + 
    "/chart.php?itemids=" + itemID;
}

function createPayload(
    eventStatus,
    eventSeverityColor,
    eventSeverity,
    eventDate,
    eventTime,
    triggerName,
    hostName,
    hostIP,
    problemURL,
    graphURL
    ) {
    var payload = {
        "@context": "http://schema.org/extensions",
        "@type": "MessageCard",
        "title": eventStatus + ": " + triggerName,
        "summary": "Zabbix notification",
        "themeColor": eventSeverityColor,
        "sections": [{
            "facts": []
        }],
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "View event",
                "targets": [
                    {
                        "os": "default",
                        "uri": problemURL
                    }
                ]
            },
            {
                "@type": "OpenUri",
                "name": "View graph",
                "targets": [
                    {
                        "os": "default",
                        "uri": graphURL
                    }
                ]
            }
        ]
    };
    if (hostName) {
        payload.sections[0].facts.push({
            "name": "Host",
            "value": hostName
        });
    }
    if (hostIP) {
        payload.sections[0].facts.push({
            "name": "IP",
            "value": hostIP
        });
    }
    if (eventSeverity) {
        payload.sections[0].facts.push({
            "name": "Severity",
            "value": eventSeverity
        });
    }
    if (eventDate && eventTime) {
        payload.sections[0].facts.push({
            "name": "Event time",
            "value": eventDate + " " + eventTime
        });
    }
    return payload;
}

try {
    req.AddHeader("Content-Type: application/json; charset=utf-8");
    if (isEventProblem(params)) {
        fields = createPayload(
                EVENT_STATUS.PROBLEM,
                SEVERITY_COLORS[params.eventNseverity] || SEVERITY_COLORS[0],
                params.eventSeverity,
                params.eventDate,
                params.eventTime,
                params.triggerName,
                params.hostName,
                params.hostIP,
                createProblemURL(params.zabbixURL, params.triggerID, params.eventID),
                createGraphURL(params.zabbixURL, params.itemID)
            );    
    } else if (isEventResolve(params)) {
        fields = createPayload(
                EVENT_STATUS.RESOLVED,
                SEVERITY_COLORS[6],
                params.eventSeverity,
                params.eventDate,
                params.eventTime,
                params.triggerName,
                params.hostName,
                params.hostIP,
                createProblemURL(params.zabbixURL, params.triggerID, params.eventID),
                createGraphURL(params.zabbixURL, params.itemID)
            );
    }
    var resp = req.Post(params.teamsURL, JSON.stringify(fields));
        if (req.Status() != 200) {
            throw JSON.parse(resp).message; 
        }
        resp = JSON.parse(resp);
    return JSON.stringify(fields);
} catch (error) {
    throw error;
}
