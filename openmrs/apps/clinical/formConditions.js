Bahmni.ConceptSet.FormConditions.rules = {
    'Diastolic Data' : function (formName, formFieldValues) {
        var systolic = formFieldValues['Systolic'];
        var diastolic = formFieldValues['Diastolic'];
        if (systolic || diastolic) {
            return {
                enable: ["Posture"]
            }
        } else {
            return {
                disable: ["Posture"]
            }
        }
    },
    'Systolic Data' : function (formName, formFieldValues) {
        var systolic = formFieldValues['Systolic'];
        var diastolic = formFieldValues['Diastolic'];
        if (systolic || diastolic) {
            return {
                enable: ["Posture"]
            }
        } else {
            return {
                disable: ["Posture"]
            }
        }
    },
        'DR,Mode of Delivery' : function (formName, formFieldValues) {
        var delivery_mode = formFieldValues['DR,Mode of Delivery'];
        
        if (delivery_mode =="Others") {
            return {
                enable: ["DR,Other Mode of Delivery"]
            }
        } else {
            return {
                disable: ["DR,Other Mode of Delivery"]
            }
        }
    },
            'DR,Term' : function (formName, formFieldValues) {
        var delivery_term = formFieldValues['DR,Term'];
        
        if (delivery_term =="Others") {
            return {
                enable: ["DR,Other Term"]
            }
        } else {
            return {
                disable: ["DR,Other Term"]
            }
        }
    }
};