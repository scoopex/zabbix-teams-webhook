if (!String.prototype.format) {
    String.prototype.format = function() {
          var args = arguments;
          return this.replace(/{(\d+)}/g, function(match, number) { 
           return number in args
               ? args[number]
               : match
           ;
       });
   };
}

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
    var problemURL = "{0}/tr_events.php?triggerid={1}&eventid={2}"
        .format(
            zabbixURL.replace(/\/+$/, ""),
            triggerID,
            eventID
        );
    return problemURL;
}

function createPayload(
    eventStatus,
    eventSeverityColor,
    eventSeverity = false,
    eventDate = false,
    eventTime = false,
    triggerName,
    hostName = false,
    hostIP = false,
    problemURL
    ) {
    var payload = {
        "@context": "http://schema.org/extensions",
        "@type": "MessageCard",
        "title": "{0}: {1}".format(eventStatus, triggerName),
        "summary": "Zabbix notification",
        "themeColor": eventSeverityColor,
        "sections": [{
            "facts": []
        }],
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "View in Zabbix",
                "targets": [
                    {
                        "os": "default",
                        "uri": problemURL
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
            "value": "{0} {1}".format(eventDate, eventTime)
        });
    }
    return payload;
}

try {
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
                createProblemURL(params.zabbixURL, params.triggerID, params.eventID)
            );
        var resp = req.Post(params.teamsURL, JSON.stringify(fields));
        if (req.Status() != 200) {
            throw JSON.parse(resp).message; 
        }
        resp = JSON.parse(resp);

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
                createProblemURL(params.zabbixURL, params.triggerID, params.eventID)
            );
        var resp = req.Post(params.teamsURL, JSON.stringify(fields));
        if (req.Status() != 200) {
            throw JSON.parse(resp).message; 
        }
        resp = JSON.parse(resp);
    }
    return JSON.stringify(resp);
} catch (error) {
    throw error;
}
