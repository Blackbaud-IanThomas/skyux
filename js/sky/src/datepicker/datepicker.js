/*jshint browser: true */
/*global angular, jQuery */

/** @module Date Picker
@icon calendar-o
@summary The date picker wraps the ui.bootstrap.datepicker directive from Angular UI Bootstrap to create an input text box with a calendar to select dates.
@description The `bb-datepicker` directive wraps the ui.bootstrap.datepicker directive from [Angular UI Bootstrap](https://angular-ui.github.io/bootstrap/). It creates an input text box with a calendar picker to select dates.

## Date Picker Settings
  - `bb-custom-validation` &mdash; Specifies an object thta contains a function to validate entries in the text box.
    - `formatValue` &mdash; A function to call when users enter text in the textbox. The only parameter to pass to the function is the raw value of the text box. If a problem occurs when formatting the input value, the function returns an object or a promise of an object with the `formattedValue` property and optionally the `formattingErrorMessage` property.
  - `bb-date-format` &mdash; Specifies the format string to use for dates in the text box. This overrides the SKY UX default of `MM/dd/yyyy` that is set in the `bbDatepickerConfig`'s `currentCultureDateFormatString` property. You set up the format string just like format strings for the [Angular date filter](https://docs.angularjs.org/api/ng/filter/date).
  - `bb-date-options` &mdash; Specifies an options object to customize the date picker. This includes all valid options for the Angular UI Bootstrap `datepicker-options` object. You can set application defaults for the `showWeeks` and `startingDay` properties of the Angular UI Bootstrap date picker in the `bbDatepickerConfig` constant defined in `sky.datepicker`. The SKY UX defaults for `showWeeks` and `startingDay` are  `false` and `0`.
  - `bb-datepicker-name` &mdash; Provides the value to bind to the `name` attribute of the date picker input. The value is used in validation and form submission.
  - `close-on-date-selection` &mdash; Indicates whether to close the date picker's calendar after a date is selected. *(Default: `true`)*
  - `datepicker-append-to-body` &mdash; Indicates whether to append the date picker popup element to `body` instead of the date picker text box. *(Default: `false`)*
  - `max-date` &mdash; A JavaScript Date object that sets a maximum date for the date picker control and input. Input validation is bound to `$scope.myFormName.inputName.$error.maxDate`. You can set this value globally in `bbDatepickerConfig`'s `maxDate` property.
  - `min-date` &mdash; A JavaScript Date object that sets a minimum date for the date picker control and input. Input validation is bound to `$scope.myFormName.inputName.$error.minDate`. You can set this value globally in  `bbDatepickerConfig`'s `minDate` property.
  - `ng-model` &mdash; Specifies an object to bind the date value in and out of the date picker. This is set to a JavaScript Date object when set or parsed from the Bootstrap date picker.
  - `placeholder` &mdash; Overrides the default placeholder text of the `bb-datepicker` input.
  - `required` &mdash; Indicates whether the date picker's text box is a required field.
  - `show-button-bar` &mdash; Indicates whether to display a button bar under the date picker. *(Default: `false`)*

## Validation
The `bb-datepicker` directive sets validation on the date picker input using `bb-datepicker-name` for the input name. The validity of the date in the input is in the `dateFormat` validator. To check if a date value is valid, you can access this through `$scope.myFormName.inputName.$error.dateFormat`. The error message for an invalid date is in `$scope.myFormName.inputName.invalidFormatMessage`.

*/
(function ($) {
    'use strict';
    angular.module('sky.datepicker', ['sky.resources', 'sky.moment', 'ui.bootstrap.datepicker'])
        .constant('bbDatepickerConfig', {
            currentCultureDateFormatString: 'MM/dd/yyyy',
            showWeeks: false,
            startingDay: 0,
            minDate: '',
            maxDate: ''
        })
        .directive('bbDatepicker', ['bbResources', 'bbDatepickerConfig', 'bbDatepickerParser', '$timeout', '$q', function (bbResources, bbDatepickerConfig, bbDatepickerParser, $timeout, $q) {
            return {
                replace: true,
                restrict: 'E',
                require: 'ngModel',
                scope: {
                    date: '=ngModel',
                    dateOptions: '=?bbDateOptions',
                    customValidation: '=?bbCustomValidation',
                    format: '=?bbDateFormat',
                    maxDate: '=?maxDate',
                    minDate: '=?minDate',
                    placeholderText: '=?placeholder'
                },
                templateUrl: 'sky/templates/datepicker/datepicker.html',
                controller: ['$scope', function ($scope) {
                    var self = this;


                    $scope.getInputNgModel = function () {
                        if (angular.isFunction(self.getInputNgModel)) {
                            return self.getInputNgModel();
                        } else {
                            return null;
                        }
                    };
                }],
                link: function ($scope, el, attr, ngModel) {
                    var parsedDate,
                        inputEl,
                        skipValidation = false,
                        dateChangeInternal = false;

                    function getBodyDatepicker() {
                        return $('body > ul[uib-datepicker-popup-wrap]');
                    }

                    function positionAbsoluteDatepicker() {
                        var calendarButtonEl = el.find('span.bb-datepicker-button-container'),
                            inputEl = el.find('input'),
                            datepickerScope = el.find('input').isolateScope(),
                            datepickerEl = getBodyDatepicker(),
                            inputWidth,
                            buttonWidth,
                            datepickerWidth;

                        inputWidth = inputEl.innerWidth();
                        buttonWidth = calendarButtonEl.innerWidth();
                        datepickerWidth = datepickerEl.innerWidth();

                        if (datepickerWidth < (inputWidth + buttonWidth)) {
                            datepickerScope.position.left = datepickerScope.position.left + inputWidth + buttonWidth - datepickerWidth;
                        }
                    }

                    function open($event) {
                        $event.preventDefault();
                        $event.stopPropagation();

                        //add syle class when datepicker appended to body because necessary bb-datefield class will no longer be wrapping it.
                        if ($scope.locals.appendToBody) {
                            $timeout(function () {
                                getBodyDatepicker().addClass('bb-datefield');
                                positionAbsoluteDatepicker();
                            });
                        }

                        $scope.locals.opened = !$scope.locals.opened;
                    }

                    function setDate() {
                        var inputNgModel;
                        if (angular.isDate($scope.date)) {
                            $scope.locals.date = $scope.date;
                        } else if (!$scope.locals.hasCustomValidation) {
                            parsedDate = bbDatepickerParser.runParsers($scope.date, $scope.format);
                            if (angular.isDate(parsedDate)) {
                                $scope.date = parsedDate;
                                $scope.locals.date = parsedDate;
                            } else {
                                $scope.locals.date = $scope.date;
                                inputNgModel = $scope.getInputNgModel();
                                if (inputNgModel && !inputNgModel.$validators.date($scope.date)) {
                                    inputNgModel.invalidFormatMessage = bbResources.date_field_invalid_date_message;
                                    inputNgModel.$setValidity('dateFormat', false);
                                }
                            }
                        } else {
                            $scope.locals.date = $scope.date;
                        }
                    }

                    $scope.locals = {
                        showButtonBar: false,
                        appendToBody: false,
                        date: '',
                        opened: false,
                        open: open,
                        loaded: false,
                        closeOnSelection: true,
                        dateOptions: {
                            showWeeks: bbDatepickerConfig.showWeeks,
                            startingDay: bbDatepickerConfig.startingDay
                        },
                        hasCustomValidation: false,
                        inputName: attr.bbDatepickerName
                    };

                    if (!$scope.maxDate && bbDatepickerConfig.maxDate) {
                        $scope.maxDate = bbDatepickerConfig.maxDate;
                    }

                    if (!$scope.minDate && bbDatepickerConfig.minDate) {
                        $scope.minDate = bbDatepickerConfig.minDate;
                    }

                    $scope.resources = bbResources;

                    if (angular.isDefined(attr.showButtonBar)) {
                        $scope.locals.showButtonBar = attr.showButtonBar;
                    }

                    if (angular.isDefined(attr.closeOnDateSelection)) {
                        $scope.locals.closeOnSelection = attr.closeOnDateSelection;
                    }

                    if (angular.isDefined(attr.datepickerAppendToBody)) {
                        $scope.locals.appendToBody = (attr.datepickerAppendToBody === 'true');
                    }

                    if (angular.isUndefined($scope.format)) {
                        $scope.format = bbDatepickerConfig.currentCultureDateFormatString;
                    }

                    if (angular.isDefined($scope.dateOptions)) {
                        angular.extend($scope.locals.dateOptions, $scope.dateOptions);

                    }

                    if (angular.isDefined($scope.customValidation)) {
                        if (angular.isFunction($scope.customValidation.formatValue)) {
                            $scope.locals.hasCustomValidation = true;
                        }
                    }

                    $scope.locals.required = angular.isDefined(attr.required);


                    if ($scope.placeholderText === null || angular.isUndefined($scope.placeholderText)) {
                        $scope.placeholderText = $scope.format.toLowerCase();
                    }

                    setDate();

                    $scope.$watch('date', function (newValue, oldValue) {
                        if (newValue !== oldValue && !dateChangeInternal) {
                            setDate();
                        } else if (dateChangeInternal) {
                            dateChangeInternal = false;
                        }
                    });

                    $scope.$watch('locals.date', function () {

                        if ($scope.date !== $scope.locals.date) {
                            if (angular.isDate($scope.locals.date)) {
                                dateChangeInternal = true;
                                $scope.date = $scope.locals.date;
                            }
                        }

                    });

                    function hasRequiredError() {
                        var inputNgModel = $scope.getInputNgModel();

                        return inputNgModel && inputNgModel.$error && inputNgModel.$error.required;
                    }


                    function dateFormatValidator() {
                        var customFormattingResult,
                            deferred,
                            inputNgModel;

                        function resolveValidation() {
                            var inputNgModel = $scope.getInputNgModel();

                            if (inputNgModel !== null) {
                                deferred[inputNgModel.invalidFormatMessage ? 'reject' : 'resolve']();
                                inputNgModel.$setValidity('dateFormat', !inputNgModel.invalidFormatMessage || inputNgModel.invalidFormatMessage === '');
                            } else {
                                deferred.resolve();
                            }
                        }

                        function setInvalidFormatMessage(errorMessage) {
                            var inputNgModel = $scope.getInputNgModel();

                            if (inputNgModel !== null) {
                                inputNgModel.invalidFormatMessage = errorMessage;
                            }
                        }

                        function handleCustomFormattingValidation(result) {
                            result = result || {};

                            setInvalidFormatMessage(result.formattingErrorMessage);
                            resolveValidation();

                            if (result.formattedValue !== $scope.date) {
                                skipValidation = true;
                                dateChangeInternal = true;
                                $scope.date = result.formattedValue;
                                $scope.locals.date = result.formattedValue;
                            }

                        }

                        function datepickerIsPristine() {
                            var inputNgModel = $scope.getInputNgModel();

                            if (inputNgModel !== null) {
                                return inputNgModel.$pristine;
                            } else {
                                return true;
                            }
                        }

                        deferred = $q.defer();

                        if (skipValidation || angular.isDate($scope.locals.date) || $scope.locals.date === '' || ($scope.locals.required && hasRequiredError()) || datepickerIsPristine()) {
                            setInvalidFormatMessage(null);
                            resolveValidation();
                        } else if ($scope.locals.hasCustomValidation && angular.isString($scope.locals.date)) {
                            customFormattingResult = $scope.customValidation.formatValue($scope.locals.date);
                            if (customFormattingResult.then) {
                                customFormattingResult.then(handleCustomFormattingValidation);
                            } else {
                                handleCustomFormattingValidation(customFormattingResult);
                                return deferred.promise;
                            }
                        } else {
                            inputNgModel = $scope.getInputNgModel();

                            if (inputNgModel !== null && inputNgModel.$error && inputNgModel.$error.date) {
                                setInvalidFormatMessage(bbResources.date_field_invalid_date_message);
                            }
                            resolveValidation();
                        }

                        skipValidation = false;
                        return deferred.promise;
                    }

                    ngModel.$asyncValidators.dateFormat = dateFormatValidator;

                    $scope.locals.loaded = true;

                    //Timeout allows the locals.loaded to be applied to dom and ng-if=true to go into effect.
                    $timeout(function () {
                        inputEl = el.find('input');
                        inputEl.on('change blur', function () {
                            $timeout(function () {
                                var inputNgModel;

                                //allows validation to kick off for invalid dates
                                if (angular.isUndefined($scope.locals.date) && angular.isDefined(inputEl.val()) && inputEl.val() !== '') {
                                    dateChangeInternal = true;
                                    $scope.date = inputEl.val();


                                } else if ($scope.locals.required && hasRequiredError()) {
                                    dateChangeInternal = true;
                                    $scope.date = '';
                                    inputNgModel = $scope.getInputNgModel();
                                    inputNgModel.invalidFormatMessage = null;
                                    inputNgModel.$setValidity('dateFormat', true);
                                } else if ($scope.date !== $scope.locals.date) {

                                    dateChangeInternal = true;
                                    $scope.date = $scope.locals.date;

                                }

                            });
                        });
                    });

                }
            };
        }])
        .directive('bbDatepickerCustomValidate', ['$filter', 'bbDatepickerParser', function ($filter, bbDatepickerParser) {
            return {
                restrict: 'A',
                require: ['ngModel', '^bbDatepicker'],
                link: function ($scope, el, attr, controllers) {
                    var ngModel = controllers[0],
                        format = attr.uibDatepickerPopup;

                    if (attr.bbDatepickerCustomValidate && attr.bbDatepickerCustomValidate === 'true') {
                        ngModel.$parsers = [];
                        ngModel.$validators.date = function () {
                            return true;
                        };
                    } else {
                        ngModel.$parsers.unshift(function (viewValue) {
                            var newDate = ngModel.$viewValue,
                                date = null;
                            //date was changed from datepicker or is empty so just return
                            if (typeof newDate === 'object' || newDate === '') {
                                return newDate;
                            }

                            date = bbDatepickerParser.runParsers(newDate, format);

                            if (angular.isDate(date)) {
                                el.val($filter('date')(date, format));
                            }

                            return date ? date : viewValue;
                        });
                    }

                    controllers[1].getInputNgModel = function () {
                        return ngModel;
                    };
                }
            };
        }])
    .directive('bbMinDate', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function ($scope, element, attrs, ngModel) {
                ngModel.$validators.minDate = function (modelValue) {
                    return !$scope.minDate || !modelValue || !angular.isDate(modelValue) || !angular.isDate($scope.minDate) || modelValue >= $scope.minDate;
                };
            }
        };
    })
    .directive('bbMaxDate', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function ($scope, element, attrs, ngModel) {
                ngModel.$validators.maxDate = function (modelValue) {
                    return !$scope.maxDate || !modelValue || !angular.isDate(modelValue) || !angular.isDate($scope.maxDate) || modelValue <= $scope.maxDate;
                };
            }
        };
    })
    .factory('bbDatepickerParser', ['bbMoment', function (bbMoment) {

        function parseUTCString(value) {
            var date = null,
                dateArray,
                datePart;

            if (angular.isString(value) && value.indexOf('T00:00:00') !== -1) {
                datePart = value.split('T')[0];

                dateArray = datePart.split('-');
                date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
            }
            return date;
        }

        function parseNoSeparatorDateString(value, format) {
            var date = null,
                yearBegin = format.indexOf('y'),
                monthBegin = format.indexOf('M'),
                dayBegin = format.indexOf('d'),
                yearIndex,
                monthIndex,
                dayIndex;
            if (angular.isString(value) && value.length === 8 && !isNaN(value)) {
                if ((dayBegin < yearBegin) && (monthBegin < yearBegin)) {
                    yearIndex = 4;
                    if (monthBegin < dayBegin) {
                        dayIndex = 2;
                        monthIndex = 0;
                    } else {
                        dayIndex = 0;
                        monthIndex = 2;
                    }
                } else if ((yearBegin < monthBegin) && (monthBegin < dayBegin)) {
                    yearIndex = 0;
                    monthIndex = 4;
                    dayIndex = 6;
                } else {
                    return null;
                }

                date = new Date(value.substr(yearIndex, 4), (value.substr(monthIndex, 2) - 1), value.substr(dayIndex, 2));
            }
            return date;
        }

        function matchSeparator(value) {
            return value.match(/[.\/\-\s].*?/);
        }

        function dateHasSeparator(value) {
            /*
            * Validation criteria:
            * A separator exists
            * There is no separator at the beginning
            * There is no separator at the end
            * Two separators exist
            * All parts of the date have a non-zero value
            */

            var separator = matchSeparator(value),
                valueArray = value.split(separator),
                separatorAtEnd = value.indexOf(separator, value.length - 1) !== -1,
                separatorAtBeginning = value.indexOf(separator) === 0,
                hasTwoSeparators = valueArray.length - 1 === 2,
                anyPartIsZero = valueArray.some(function (e) {
                    return Number(e) === 0;
                });

            return (separator && !separatorAtEnd && !separatorAtBeginning && hasTwoSeparators && !anyPartIsZero);
        }

        function isMomentParsable(value, format) {
            var yearParts,
                yearIndex,
                monthIndex,
                dayIndex,
                separator;

            if (angular.isString(value) && dateHasSeparator(value)) {

                if (value.length === 10) {
                    return true;
                } else if (value.length === 9 || value.length === 8) {
                    //insure that years have 4 characters
                    separator = matchSeparator(value);
                    yearParts = value.split(separator);
                    yearIndex = format.indexOf('y');
                    monthIndex = format.indexOf('M');
                    dayIndex = format.indexOf('d');
                    if (yearIndex > monthIndex && yearIndex > dayIndex) {
                        return yearParts[2].length === 4;
                    }

                    if (yearIndex < monthIndex && yearIndex < dayIndex) {
                        return yearParts[0].length === 4;
                    }

                }

            }

            return false;
        }



        function parseMoment(value, format) {
            var date = null,
                momentDate;

            if (isMomentParsable(value, format)) {
                momentDate = bbMoment(value, format.toUpperCase());
                if (momentDate.isValid()) {
                    date = momentDate.toDate();
                }
            }

            return date;
        }

        return {
            parseUTCString: parseUTCString,
            parseNoSeparatorDateString: parseNoSeparatorDateString,
            parseMoment: parseMoment,
            runParsers: function (value, format) {
                var date = null;

                if (!value || angular.isDate(value) || value === '') {
                    return value;
                }

                date = parseUTCString(value);

                if (angular.isDate(date)) {
                    return date;
                }

                date = parseNoSeparatorDateString(value, format);

                if (angular.isDate(date)) {
                    return date;
                }

                date = parseMoment(value, format);

                return date;

            }
        };
    }]);


}(jQuery));
