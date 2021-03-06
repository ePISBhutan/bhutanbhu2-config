'use strict';

angular.module('bahmni.common.displaycontrol.custom')
    .directive('birthCertificate', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
            var link = function ($scope) {
                console.log("inside birth certificate");
                var conceptNames = ["HEIGHT"];
                $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/birthCertificate.html";
                spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                    $scope.observations = response.data;
                }));
            };

            return {
                restrict: 'E',
                template: '<ng-include src="contentUrl"/>',
                link: link
            }
    }]).directive('deathCertificate', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
        var link = function ($scope) {
            var conceptNames = ["WEIGHT"];
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/deathCertificate.html";
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observations = response.data;
            }));
        };

        return {
            restrict: 'E',
            link: link,
            template: '<ng-include src="contentUrl"/>'
        }
    }]).directive('customTreatmentChart', ['appService', 'treatmentConfig', 'TreatmentService', 'spinner', '$q', function (appService, treatmentConfig, treatmentService, spinner, $q) {
    var link = function ($scope) {
        var Constants = Bahmni.Clinical.Constants;
        var days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/customTreatmentChart.html";

        $scope.atLeastOneDrugForDay = function (day) {
            var atLeastOneDrugForDay = false;
            $scope.ipdDrugOrders.getIPDDrugs().forEach(function (drug) {
                if (drug.isActiveOnDate(day.date)) {
                    atLeastOneDrugForDay = true;
                }
            });
            return atLeastOneDrugForDay;
        };

        $scope.getVisitStopDateTime = function () {
            return $scope.visitSummary.stopDateTime || Bahmni.Common.Util.DateUtil.now();
        };

        $scope.getStatusOnDate = function (drug, date) {
            var activeDrugOrders = _.filter(drug.orders, function (order) {
                if ($scope.config.frequenciesToBeHandled.indexOf(order.getFrequency()) !== -1) {
                    return getStatusBasedOnFrequency(order, date);
                } else {
                    return drug.getStatusOnDate(date) === 'active';
                }
            });
            if (activeDrugOrders.length === 0) {
                return 'inactive';
            }
            if (_.every(activeDrugOrders, function (order) {
                    return order.getStatusOnDate(date) === 'stopped';
                })) {
                return 'stopped';
            }
            return 'active';
        };

        var getStatusBasedOnFrequency = function (order, date) {
            var activeBetweenDate = order.isActiveOnDate(date);
            var frequencies = order.getFrequency().split(",").map(function (day) {
                return day.trim();
            });
            var dayNumber = moment(date).day();
            return activeBetweenDate && frequencies.indexOf(days[dayNumber]) !== -1;
        };

        var init = function () {
            var getToDate = function () {
                return $scope.visitSummary.stopDateTime || Bahmni.Common.Util.DateUtil.now();
            };

            var programConfig = appService.getAppDescriptor().getConfigValue("program") || {};

            var startDate = null, endDate = null, getEffectiveOrdersOnly = false;
            if (programConfig.showDetailsWithinDateRange) {
                startDate = $stateParams.dateEnrolled;
                endDate = $stateParams.dateCompleted;
                if (startDate || endDate) {
                    $scope.config.showOtherActive = false;
                }
                getEffectiveOrdersOnly = true;
            }

            return $q.all([treatmentConfig(), treatmentService.getPrescribedAndActiveDrugOrders($scope.config.patientUuid, $scope.config.numberOfVisits,
                $scope.config.showOtherActive, $scope.config.visitUuids || [], startDate, endDate, getEffectiveOrdersOnly)])
                .then(function (results) {
                    var config = results[0];
                    var drugOrderResponse = results[1].data;
                    var createDrugOrderViewModel = function (drugOrder) {
                        return Bahmni.Clinical.DrugOrderViewModel.createFromContract(drugOrder, config);
                    };
                    for (var key in drugOrderResponse) {
                        drugOrderResponse[key] = drugOrderResponse[key].map(createDrugOrderViewModel);
                    }

                    var groupedByVisit = _.groupBy(drugOrderResponse.visitDrugOrders, function (drugOrder) {
                        return drugOrder.visit.startDateTime;
                    });
                    var treatmentSections = [];

                    for (var key in groupedByVisit) {
                        var values = Bahmni.Clinical.DrugOrder.Util.mergeContinuousTreatments(groupedByVisit[key]);
                        treatmentSections.push({visitDate: key, drugOrders: values});
                    }
                    if (!_.isEmpty(drugOrderResponse[Constants.otherActiveDrugOrders])) {
                        var mergedOtherActiveDrugOrders = Bahmni.Clinical.DrugOrder.Util.mergeContinuousTreatments(drugOrderResponse[Constants.otherActiveDrugOrders]);
                        treatmentSections.push({
                            visitDate: Constants.otherActiveDrugOrders,
                            drugOrders: mergedOtherActiveDrugOrders
                        });
                    }
                    $scope.treatmentSections = treatmentSections;
                    if ($scope.visitSummary) {
                        $scope.ipdDrugOrders = Bahmni.Clinical.VisitDrugOrder.createFromDrugOrders(drugOrderResponse.visitDrugOrders, $scope.visitSummary.startDateTime, getToDate());
                    }
                });
        };
        spinner.forPromise(init());
    };

    return {
        restrict: 'E',
        link: link,
        scope: {
            config: "=",
            visitSummary: '='
        },
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('referralsummaryFooter', ['$q','observationsService','appService', 'spinner','$sce', function ($q,observationsService,appService, spinner, $sce)
           {
               var link = function ($scope)
               {

                   var conceptRefFor = ["Referral Form, Referred For"];
                    
                   spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptRefFor, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                           $scope.obsRefFor = response.data[0];
                       }));

                   $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/referralSummaryFooter.html";
                   $scope.curDate=new Date();

               };
               var controller = function($scope){
                $scope.htmlLabel = function(label){
                    return $sce.trustAsHtml(label)
                }
               }
               return {
                   restrict: 'E',
                   link: link,
                   controller : controller,
                   template: '<ng-include src="contentUrl"/>'
               }
           }]).directive('referralSummary', ['$q','observationsService','appService', 'spinner','$sce', function ($q,observationsService,appService, spinner, $sce)
           {
               var link = function ($scope)
               {

                   var conceptRefFrom = ["Referral Form, Referred From"];
                    var conceptRefTo=["Referral Form, Referred To"];
                    
                   spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptRefFrom, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                           $scope.obsRefFrom = response.data[0];
                       }));
                     spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptRefTo, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                                   $scope.obsRefTo = response.data[0];
                               }));

                   $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/referralSummary.html";
                   $scope.curDate=new Date();

               };
               var controller = function($scope){
                $scope.htmlLabel = function(label){
                    return $sce.trustAsHtml(label)
                }
               }
               return {
                   restrict: 'E',
                   link: link,
                   controller : controller,
                   template: '<ng-include src="contentUrl"/>'
               }
               }]).directive('dischargeSummary', ['$q','observationsService','appService', 'spinner','$sce', function ($q,observationsService,appService, spinner, $sce)
           {
               var link = function ($scope)
               {

                   var conceptInstructionOnDischarge = ["Instructions on Discharge"];
                   var conceptFollowUpDate = ["Follow up Date"];
                   var conceptFollowUpNote = ["Follow-Up Notes"];
                    
                   spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptInstructionOnDischarge, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                           $scope.obsDischarge = response.data[0];
                       }));

                   spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptFollowUpDate, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                           $scope.obsFollowUpDate= response.data[0];
                       }));

                   spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptFollowUpNote, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                           $scope.obsFollowUpNote = response.data[0];
                       }));


                   $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/dischargeSummary.html";
                   $scope.curDate=new Date();

               };
               var controller = function($scope){
                $scope.htmlLabel = function(label){
                    return $sce.trustAsHtml(label)
                }
               }
               return {
                   restrict: 'E',
                   link: link,
                   controller : controller,
                   template: '<ng-include src="contentUrl"/>'
               }
           }]).directive('dischargesummaryHeader', ['$q','observationsService','appService', 'spinner','$sce', function ($q,observationsService,appService, spinner, $sce)
           {
               var link = function ($scope)
               {
                   $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/dischargeSummaryHeader.html";
                   $scope.curDate=new Date();

               };
               var controller = function($scope){
                $scope.htmlLabel = function(label){
                    return $sce.trustAsHtml(label)
                }
               }
               return {
                   restrict: 'E',
                   link: link,
                   controller : controller,
                   template: '<ng-include src="contentUrl"/>'
               }
           }]).directive('patientsummary', ['$q','observationsService','appService', 'spinner','$sce', function ($q,observationsService,appService, spinner, $sce)
{
    var link = function ($scope)
    {
        var medication = ["Consultation Note"];
        var nonCodedDiagnosis = ["Non-coded Diagnosis"];
        var codedDiagnosis = ["Coded Diagnosis"];
        var conceptFollowUpNotes = ["Follow up Form, Follow up Notes"];
        var codedDiagnosisResponse='';
        var nonCodedDiagnosisResponse='';
        var count;


        spinner.forPromise(observationsService.fetch($scope.patient.uuid, medication, undefined, 1, undefined, undefined).then(function (response) {
            $scope.obsMedication = response.data[0];
        }));

        spinner.forPromise(observationsService.fetch($scope.patient.uuid, nonCodedDiagnosis,undefined, 1, undefined, undefined).then(function (response) {
            for(count=0; count<response.data.length;count++)
            {
                if(nonCodedDiagnosisResponse=='')
                {
                    nonCodedDiagnosisResponse=response.data[count].valueAsString;
                }
                else {
                    nonCodedDiagnosisResponse = nonCodedDiagnosisResponse + ', ' + response.data[count].valueAsString;
                }

            }

        }));

        spinner.forPromise(observationsService.fetch($scope.patient.uuid, codedDiagnosis,undefined, 1, undefined, undefined).then(function (response) {

            codedDiagnosisResponse=nonCodedDiagnosisResponse;

            for(count=0; count<response.data.length;count++)
            {
                if(codedDiagnosisResponse=='')
                {
                    codedDiagnosisResponse=response.data[count].valueAsString;
                }
                else {
                    codedDiagnosisResponse = codedDiagnosisResponse + ', ' + response.data[count].valueAsString;
                }

            }

            $scope.obsCodedDiagnosis=codedDiagnosisResponse;

        }));

        spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptFollowUpNotes, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                           $scope.obsFollowUpNotes = response.data[0];
                       }));

        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/patientSummary.html";
        $scope.curDate=new Date();

    };
    var controller = function($scope){
        $scope.htmlLabel = function(label){
            return $sce.trustAsHtml(label)
        }
    }
    return {
        restrict: 'E',
        link: link,
        controller : controller,
        template: '<ng-include src="contentUrl"/>'
    }
}]);
