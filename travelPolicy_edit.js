'use strict';

/*    Объект-контейнер коллекции наборов правил текущей группы правил
 *
 *    В перспективе, все должно начинаться после занесения
 *    данных с удалнного хранилища в контейнер
 *
 *    Методы редактирования и просмотра условий -
 *    так же происходят через этот объект.
 */
var tpgRuleset = {};


var rulesetMethods = {
    tpRuleSetTool: function (event) {
        // additional methods for ruleset ruleType
        // @renderTPRulesetCollection
        event.preventDefault();
        event.stopPropagation();
    },
    tpGroupNameChange: function () {
        saveTPolicy(tpGroupId);
        return false;
    },
    tprFieldEditionSubmit: function (event) {
        event.preventDefault();

        var $this = $(this);

        var dataRule        = $this.parents('.pop-alert-content').find('.ruleDescriptor');
        var ruleId          = $(dataRule).data('ruleid');
        var ruleToDelete    = $(dataRule).data('ruletodelete');

        var ruleField   = $(dataRule).data('field');
        var ruleType    = $(dataRule).data('ruletype');

        var conds = $this.parents('form.tpRuleField');

        renderTravelPolicyRule({
            groupId:       tpGroupId,

            ruleId:        ruleId,
            ruleToDelete:  ruleToDelete,

            ruleField:     ruleField,
            ruleType:      ruleType,
            conds:         conds
        });

        var ruleLine    = $('tr[data-ruleid=' + ruleId + ']');

        var saveButton  = ruleLine.find('[data-action=saveChanges]');
        $(  saveButton  ).removeAttr('disabled');

        var cancelButton = ruleLine.find('[data-action=cancelChanges]');
        //$(  cancelButton  ).removeProp('disabled');
        $( cancelButton ).prop('disabled', false);


        var findRuleById = function ( rule ) {
            return rule.travel_policy_rule_id == ruleId;
        };

        var thisRule = $.grep(tpgRuleset[ruleType], findRuleById);
        thisRule = thisRule[0];

        delete thisRule.conditions.condType;

        closePopAlert( $this.parents('.pop-alert-content') );
    },

    /* Time Interval function to add it on tprcTime type condition edit screen */
    addTimeInterval: function (event) {

        event.preventDefault();
        event.stopPropagation();

        var $timeRangeContainer = $('#time-range');
        var $timeRangeElements = $timeRangeContainer.find('[class*=tprTime]');
        var elementIndex = $timeRangeElements.length;

        var condTime;
        condTime = '<div class="tprTimer' + elementIndex + '">'
            +     '<p>'
            +        '<i class="removeInterval fa fa-times"></i>'
            +        'Временной интервал: '
            +        '<span class="slider-time">00:00</span> — '
            +        '<span class="slider-time2">23:59</span>'
            +    '</p>'
            +    '<div class="sliderBody"></div>'
            + '</div>';

        $timeRangeContainer.append(condTime);

        $timeRangeContainer.find('[class=tprTimer' + elementIndex + '] .sliderBody').slider({
            range: true,
            min: 0,
            max: 1439,
            step: 1,
            values: [0 , 1439],
            slide: function (e, ui) {

                var hours1 = String(Math.floor(ui.values[0] / 60));
                var minutes1 = String(ui.values[0] - (hours1 * 60));

                if (hours1.length == 1) { hours1 = '0' + hours1; }
                if (minutes1.length == 1) { minutes1 = String('0' + minutes1); }
                if (minutes1 == 0) { minutes1 = '00'; }

                $(this).find('.slider-time').html(hours1 + ':' + minutes1);

                var hours2 = String(Math.floor(ui.values[1] / 60));
                var minutes2 = String(ui.values[1] - (hours2 * 60));

                if (hours2.length == 1) { hours2 = '0' + hours2; }
                if (minutes2.length == 1) { minutes2 = '0' + minutes2; }
                if (minutes2 == 0) { minutes2 = '00'; }

                $(this).parent().find('.slider-time2').html(hours2 + ':' + minutes2);
            }
        });

        disableSliderTrack( $timeRangeElements );
    },

    removeTimeInterval: function (event) {
        event.stopPropagation();
        event.preventDefault();

        var $this = $(this);

        $this.parents('[class^=tprTimer]').remove();
    },

    /* @renderTPRulesetCollection */
    createNewRuleInTypeset :function (event) {
        event.preventDefault();

        var $that = $(event.currentTarget);

        var ruleType = $that.parents('.tpRuleset').data('ruletype');

        var today = new Date();
        today = (today.getDate()) + '/'
            + (today.getMonth() + 1) + '/'
            + (today.getFullYear()) + ' '
            + '['+today.getHours()+':'+today.getMinutes()+']';

        var ruleName = 'Новое правило (' + today + ')';

        var setNewRequest = setTravelPolicyShortRule({
            groupId:        tpGroupId,

            ruleId:         0,
            ruleType:       ruleType,

            ruleName:       ruleName,
            ruleActive:     0,
            ruleToDelete:   0,
            conds:          {}
        });

        $.when(setNewRequest)
            .done(function (tpRuleNew) {
                //console.log(tpRuleNew);
            });
    },

    /* show\hide deleted rules */
    showDeleted: function (event) {
        event.preventDefault();

        var $this = $(this);
        var $that = $this.parents('.tpRuleset');

        $that.toggleClass('showDeleted');

        if( $that.hasClass('showDeleted') ){
            $that.find('.tprsTool.showDeleted')
                .text('Скрыть удаленные');
        } else {
            $that.find('.tprsTool.showDeleted')
                .text('Показать удаленные');
        }
    },
    hideInactive: function (event) {
        event.preventDefault();

        var $this = $(this);
        var $that = $this.parents('.tpRuleset');

        $that.toggleClass('hideInactive');

        if( $that.hasClass('hideInactive') ){
            $that.find('.tprsTool.hideInactive')
                .text('Показать неактивные');
        } else {
            $that.find('.tprsTool.hideInactive')
                .text('Скрыть неактивные');
        }
    }
};

/*  Wizard создания правила */
var formWizard;

/*  Флаги загрузки скриптов:
 *  @var scriptValidateIsLoaded
 *  @var scriptStepsIsLoaded
 */
var scriptValidateIsLoaded = false;
var scriptStepsIsLoaded = false;

var editConditionPopUp = function () {
    var $that = $(this);

    var ruleLine    = $that.parents('[data-ruleid]');

    var ruleType    = $that.parents('.tpRuleset').data('ruletype');

    var ruleId          = ruleLine.data('ruleid');
    var ruleName        = ruleLine.data('rulename');
    var ruleActive      = ruleLine.data('ruleactive');
    var ruleToDelete    = ruleLine.data('ruledelete');

    var condIndex       = $that.index();
    var condHTML        = $that.html();

    var condsObject     = parseHTMLhelper( ruleType, condHTML, condIndex, ruleId, ruleName, ruleActive, ruleToDelete );

    var editorFieldName;
    var editorTitle;
    var editorBody;

    if( condsObject !== null ) {

        editorFieldName = String(vocabulary[condsObject.type][condsObject.field].fieldName)
            .toLowerCase();

        editorTitle     = 'Редактор условия <br />'
            + '«' + editorFieldName + '»';

        editorBody = fieldEditorPopup[condsObject.type][condsObject.field](condsObject);
    }

    var popUpText    = '<h2 class="ruleDescriptor"'
        +    ' data-ruleId="'        + ruleId                    + '" '
        +    ' data-field="'         + condsObject.field         + '" '
        +    ' data-ruleActive="'    + condsObject.ruleToDelete  + '" '
        +    ' data-ruleField="'     + condsObject.ruleField     + '" '
        +    ' data-ruleType="'      + condsObject.ruleType      + '" '
        + '>' + editorTitle + '</h2>';

    popAlert( popUpText + '' + editorBody );
    /*
     *  Вызывал магию!
     *

     $('.pop-alert .pop-alert-content').on('click', function (event) {
     event.stopPropagation();
     });
     */
    if( condsObject.field == 'time') {

        var $timerSliders = $('#time-range').find('[class*=tprTimer] .sliderBody');

        $timerSliders.each(function () {
            var $that = $(this);

            var timeStart = $that.parent().find('.slider-time').text().split(':');
            var timeEnd = $that.parent().find('.slider-time2').text().split(':');

            timeStart = Number(timeStart[0])*60+Number(timeStart[1]);
            timeEnd = Number(timeEnd[0])*60+Number(timeEnd[1]);

            $that.slider({
                range: true,
                min: 0,
                max: 1439,
                step: 1,
                values: [timeStart , timeEnd],
                slide: function (e, ui) {
                    var $sliverThis = $(this);

                    var hours1 = String(Math.floor(ui.values[0] / 60));
                    var minutes1 = String(ui.values[0] - (hours1 * 60));

                    if (hours1.length == 1) { hours1 = '0' + hours1; }
                    if (minutes1.length == 1) { minutes1 = String('0' + minutes1); }
                    if (minutes1 == 0) { minutes1 = '00'; }

                    $sliverThis.parent().find('.slider-time').html(hours1 + ':' + minutes1);

                    var hours2 = String(Math.floor(ui.values[1] / 60));
                    var minutes2 = String(ui.values[1] - (hours2 * 60));

                    if (hours2.length == 1) { hours2 = '0' + hours2; }
                    if (minutes2.length == 1) { minutes2 = '0' + minutes2; }
                    if (minutes2 == 0) { minutes2 = '00'; }

                    $sliverThis.parent().find('.slider-time2').html(hours2 + ':' + minutes2);
                }
            });
        });
    }

    var checkedInput;
    var serverResponse = '';

    if( condsObject.field == 'geography' || condsObject.field == 'company' ) {
        var tagitInput;
    }

    if( condsObject.field == 'geography') {
        var geoField = $('.geographyField .tprGeography');
        var geoTagCode = '';

        var afterCreatedCallback = (function () {

            $('.tagit-choice').each(function () {
                var $currentTag = $(this);

                var currentGeoCode = $(this).data('geocode');

                if( !currentGeoCode ) {

                    $.each( $('.condGeo'), function (item, value) {
                        if( $currentTag.find('.tagit-label').text() == $(value).text() ) {
                            $currentTag.data('geocode', $(value).data('geocode') );
                        }
                    })
                }
            });
        })();

        geoField.tagit({
            autocomplete: {
                create: function( event, ui ) {
                    var ajaxLoader = '<i class="ajaxLoading fa fa-refresh fa-spin"></i>';
                    var $currentWidget = $('.tagit.ui-widget-content .tagit-new');
                    $currentWidget.append(ajaxLoader);
                    return false;
                },
                delay: 270,
                minLength: 3,
                source: function (req, res) {

                    geoTagCode = '';

                    var request = getTPGRCitiesAutocomplete[ruleType] + req.term;

                    $.ajax({
                        dataType: 'json',
                        url: request,
                        success: function (data) {
                            serverResponse = data;

                            res( $.map( data, function ( item ) {

                                return {
                                    label:    item.label + ' (' + item.code + ')',
                                    value:    item.label,
                                    code:    item.code
                                }
                            }) );
                        }
                    });
                },
                select: function (event, ui) {
                    geoTagCode = ui.item.code;
                    geoField.tagit("createTag", ui.item.value);

                    return false;
                }
            },
            singleField: false,
            singleFieldDelimiter: '; ',
            beforeTagAdded: function (evt, ui) {
                if ( ui.duringInitialization === false ){
                    serverResponse = ( $.map( serverResponse, function ( city ) {
                        return city.label;
                    }) );

                    if ($.inArray(ui.tagLabel, serverResponse) == -1) {
                        return false;
                    }
                }

                $(ui.tag).data('geocode', geoTagCode);
            },
            afterCreated: afterCreatedCallback
        });

        checkedInput = $('.tpRuleField.geographyField input:checked');
        tagitInput = $('.tpRuleField.geographyField .tagit');

        if( checkedInput.val() == 'cities' ) {
            tagitInput.show()
        }

        $('.tpRuleField.geographyField input[name="geography"]').on('change', function () {
            var isCities = $(this).val() == 'cities';
            var tagitList = $('.tpRuleField.geographyField .tagit');

            if( isCities ) {
                $( tagitList ).show();
            } else {
                $( tagitList ).hide();
            }
        });
    }

    if( condsObject.field == 'company') {

        var companyField = $('.companyField .tprCompany');
        var companyCode = '';

        companyField.tagit({
            autocomplete: {
                create: function( event, ui ) {
                    var ajaxLoader = '<i class="ajaxLoading fa fa-refresh fa-spin"></i>';
                    var $currentWidget = $('.tagit.ui-widget-content .tagit-new');
                    $currentWidget.append(ajaxLoader);
                    return false;
                },
                delay: 270,
                minLength: 3,
                source: function (req, res) {
                    companyCode = '';

                    var request = '/index/airlineautocomplete?q=' + req.term;

                    $.ajax({
                        dataType: 'json',
                        url: request,
                        success: function (data) {
                            serverResponse = data;

                            res( $.map( data, function ( item ) {
                                return {
                                    label:    item.name + ' (' + item.code + ')',
                                    value:    item.name,
                                    code:    item.code
                                }
                            }) );
                        }
                    });
                },
                select: function (event, ui) {

                    companyCode = ui.item.code;
                    companyField.tagit("createTag", ui.item.value);

                    return false;
                }
            },
            singleField: false,
            singleFieldDelimiter: '; ',
            beforeTagAdded: function (evt, ui) {
                if ( ui.duringInitialization !== true ){
                    serverResponse = ( $.map( serverResponse, function ( company ) {
                        return company.name;
                    }) );

                    if ($.inArray(ui.tagLabel, serverResponse) == -1) {
                        return false;
                    }
                    $(ui.tag).data('companycode', companyCode);
                }
            }
        });

        checkedInput = $('.tpRuleField.companyField input:checked');
        tagitInput = $('.tpRuleField.companyField .tagit');

        if( checkedInput.val() == 'companies' ) {
            tagitInput.show()
        }

        $('.tpRuleField.companyField input[name="company"]').on('change', function () {
            var isCompanies = $(this).val() == 'companies';
            var tagitList = $('.tpRuleField.companyField .tagit');

            if( isCompanies ) {
                $( tagitList ).show();
            } else {
                $( tagitList ).hide();
            }
        });
    }
};

var makeSomeRulelineAction = function (event) {
    event.preventDefault();

    var $that = $(event.target);

    var ruleLine      = $that.parents('[data-ruleid]');
    var ruleType      = $that.parents('.tpRuleset').data('ruletype');
    var ruleId        = ruleLine.data('ruleid');
    var ruleActive    = ruleLine.data('ruleactive');
    // var ruleToDelete  = ruleLine.data('ruledeleted');

    ruleActive      = ruleActive ? 1 : 0;

    // var memoryRulesetSameType = tpgRuleset[ruleType];
    var memoryRuleset = tpgRuleset;

    var findRuleById = function ( rule ) {
        return rule.travel_policy_rule_id == ruleId;
    };

    var thisRule = $.grep(tpgRuleset[ruleType], findRuleById);
    thisRule = thisRule[0];

    delete thisRule.conditions.condType;

    if ( $that.is('.slide-label') ) {
        thisRule.travel_policy_rule_active = (ruleActive ? 0 : 1);

        ruleActive = ruleActive ? 0 : 1;
        ruleActive = ruleActive*1;

        ruleLine.data('ruleactive', ruleActive);
        ruleLine.find( $('[name=tpgRule_' + ruleId + '_active]').val(ruleActive) );

        var checked = $('#tpRule_' + ruleId + '_active').prop("checked");

        var activationTrigger = ruleLine.find('#tpRule_' + ruleId + '_active').val(ruleActive);


        if (checked) {
            activationTrigger.val(ruleActive)
                .removeAttr("checked")
                .prop("checked", !checked);
        } else {
            activationTrigger.val(ruleActive)
                .attr("checked", !checked)
                .prop("checked", !checked);
        }

        setTravelPolicyShortRule({
            ruleType:      ruleType,
            ruleId:        ruleId,

            conds:         memoryRuleset
        });
    }

    if ( $that.is('[data-action=saveChanges]') ) {
        thisRule.travel_policy_rule_active = ruleActive;
        setTravelPolicyRule({
            ruleType:   ruleType,
            ruleId:     ruleId,
            conds:      thisRule
        });
    }

    if ( $that.is('[data-action=cancelChanges]') ) {
        console.log('?????????cancelChanges');
    }

    if ( $that.is('[data-action=removeRule]') ) {
        thisRule.travel_policy_rule_to_delete = 1;
        ruleLine.data('data-ruledeleted', 1);

        $that.attr('disabled','');

        ruleLine.find('[data-action=saveChanges]').removeAttr('disabled');
        ruleLine.find('[data-action=restoreRule]').removeAttr('disabled');
    }

    if ( $that.is('[data-action=restoreRule]') ) {
        thisRule.travel_policy_rule_to_delete = 0;
        ruleLine.attr('data-ruledeleted', 0);

        $that.attr('disabled','');

        ruleLine.find('[data-action=removeRule]').removeAttr('disabled');
        ruleLine.find('[data-action=saveChanges]').removeAttr('disabled');
    }

    /*
     var ruleDescription = {
     that: $that,
     ruleGroupId:    ruleGroupId,
     ruleLine:       ruleLine,
     ruleType:       ruleType,
     ruleId:         ruleId,
     ruleName:       ruleName,
     ruleActive:     ruleActive,
     ruleToDelete:   ruleToDelete
     };
     */
    //console.log(ruleDescription);
    return false;
};

var newRulesetObject = {};
var sendCreatedRule = function(){

    var settedRuleSections = $('.wizard>.content>section .tpRuleField');
    var sectionsLength = settedRuleSections.length;
    var sectionIndex = 0;

    var ruleType = formWizard.find('section')
        .first()
        .find('.active')
        .data('ruletype');



    var today = new Date();
    today = (today.getDate()) + '/'
        + (today.getMonth() + 1) + '/'
        + (today.getFullYear()) + ' '
        + '['+today.getHours()+':'+today.getMinutes()+']';

    var ruleName = 'Новое правило (' + today + ')';


    newRulesetObject = {};

    newRulesetObject = {
        travel_policy_rule_group_id:    tpGroupId,
        travel_policy_rule_type:        ruleType,
        travel_policy_rule_name:        ruleName,
        travel_policy_rule_id:          0,
        travel_policy_rule_active:      0,
        travel_policy_rule_to_delete:   0,
        conditions: {}
    };


    for(sectionIndex; sectionIndex < sectionsLength; sectionIndex++){
        var sectionType = $( settedRuleSections[sectionIndex] ).attr('class');
        sectionType = sectionType
            .replace(/tpRuleField /gi,'')
            .replace(/Field/,'');

        var renderer = vocabulary[ruleType][sectionType].fieldParseToSave;
        var originalKey = vocabulary[ruleType][sectionType].fieldInitName || sectionType;
        console.log(originalKey, sectionType);
        newRulesetObject.conditions[originalKey] = renderer( settedRuleSections[sectionIndex] );
    }


    var conditions = newRulesetObject.conditions;


    for(var key in conditions ){
        if (!conditions.hasOwnProperty(key)) continue;

        if(typeof conditions[key] === 'object') {
            for(var subKey in conditions[key] ){
                if (!conditions[key].hasOwnProperty(subKey)) continue;

                if( conditions[key][subKey] === 'defaultValue' ) {
                    conditions[key][subKey]  =  '';
                }
            }
        } else {
            if( conditions[key] === 'defaultValue' ) {
                conditions[key]  =  '';
            }
        }
    }

    newRulesetObject.conditions = conditions;

    var setTPGRuleURL = '/travelpolicy/setrule?rule_id=' + 0;
    var ruleCreateRequest;

    /* Обработчик ошибок и их статусов в $.AJAX запросах */
    var handleError = function (e) {
        var popMsg  =   'Ошибка: '
            +       '<br /><br /><pre>'
            +           e.status + ' — ' + e.statusText
            +       '</pre><br /><br />'
            +   'Обратитесь в тех.поддержку.';

        popAlert(popMsg);
    };

    ruleCreateRequest = $.ajax({
        type: 'POST',
        url: setTPGRuleURL,
        data: dataObjectToForm(newRulesetObject),

        processData: false,
        contentType: false,
        cache: false,
        success: function(res){
            res = JSON.parse(res);

            if(res.error){
                res.status = '501: Проблемы сохранения данных на сервере';
                res.statusText = res.error;

                handleError(res);
            }
        },
        error: handleError
    });

    $.when(ruleCreateRequest)
        .progress( function() {
            addLoader();
        }).done(function() {
            //var updatedRule = renderTPRuleConditions(thisRule);
            //$('[data-ruleid='+ ruleId +'][data-id=rsCondition]').html(updatedRule);

            delLoader();
            return newRulesetObject;
        });
};


var getTPGRCitiesAutocomplete = {};
getTPGRCitiesAutocomplete.avia = '/index/airportautocomplete?q=';
getTPGRCitiesAutocomplete.train = '/index/stationsautocomplete?q=';
getTPGRCitiesAutocomplete.transfer = '/index/airportautocomplete?q=';


var createRuleWizard = function (event) {

    event.preventDefault();
    var newRuleType = '';


    var renderRulesetSections = function () {
        var content = renderAllRuleFieldsByType(newRuleType);
        var currentWizardStep = formWizard.steps('getCurrentIndex');

        var stepsCount = formWizard.find('.steps li').length;
        if( stepsCount > 2 ){
            var stepToRemove = stepsCount - 2;

            for( var index = 0; index < stepToRemove; index++){
                formWizard.steps('remove', currentWizardStep+1, index);
            }
        }

        $.each(content, function (index) {
            var newRuleSectionIndex = currentWizardStep + index + 1;

            formWizard.steps("insert", newRuleSectionIndex, {
                //title: '@#@#^%@@',
                content: content[index]
            });
        });

        /*-----------------*/
        var $timerSliders = $('#time-range').find('[class*=tprTimer] .sliderBody');

        $timerSliders.each(function () {
            var $that = $(this);

            var timeStart = $that.parent().find('.slider-time').text().split(':');
            var timeEnd = $that.parent().find('.slider-time2').text().split(':');

            timeStart = Number(timeStart[0])*60+Number(timeStart[1]);
            timeEnd = Number(timeEnd[0])*60+Number(timeEnd[1]);

            $that.slider({
                range: true,
                min: 0,
                max: 1439,
                step: 1,
                values: [timeStart , timeEnd],
                slide: function (e, ui) {
                    var $sliverThis = $(this);

                    var hours1 = String(Math.floor(ui.values[0] / 60));
                    var minutes1 = String(ui.values[0] - (hours1 * 60));

                    if (hours1.length == 1) { hours1 = '0' + hours1; }
                    if (minutes1.length == 1) { minutes1 = String('0' + minutes1); }
                    if (minutes1 == 0) { minutes1 = '00'; }

                    $sliverThis.parent().find('.slider-time').html(hours1 + ':' + minutes1);

                    var hours2 = String(Math.floor(ui.values[1] / 60));
                    var minutes2 = String(ui.values[1] - (hours2 * 60));

                    if (hours2.length == 1) { hours2 = '0' + hours2; }
                    if (minutes2.length == 1) { minutes2 = '0' + minutes2; }
                    if (minutes2 == 0) { minutes2 = '00'; }

                    $sliverThis.parent().find('.slider-time2').html(hours2 + ':' + minutes2);
                }
            });
        });
    };


    var getValidateScript = function(){
        $.getScript('/js/jquery.validate.min.js', function (){
            //scriptValidateIsLoaded = true;

            /*
             formWizard.validate({
             errorPlacement: function errorPlacement(error, element) { element.before(error); },
             rules: {
             confirm: {
             equalTo: "#password"
             }
             }
             });
             */
        });
    };

    var getStepsScript = function(){

        $.getStylesheet('/css/jquery.steps.css');
        $.getScript('/js/jquery.steps.js', function (){
            //scriptStepsIsLoaded = true;

            formWizard.steps({
                labels: {
                    cancel:     'Отмена',
                    finish:     'Сохранить',
                    next:       'Далее',
                    previous:   'Назад'
                },
                headerTag: 'h3',
                bodyTag: 'section',
                transitionEffect: 'slideLeft',
                onStepChanging: function (event, currentIndex, newIndex) {
                    //formWizard.validate().settings.ignore = ':disabled,:hidden';
                    //return formWizard.valid();
                    return $('.ruleType [data-ruletype].active').length;
                },
                onFinishing: function (event, currentIndex) {
                    //formWizard.validate().settings.ignore = ':disabled';
                    //return formWizard.valid();
                    console.log('onFinishing');
                    console.log(sendCreatedRule);
                    return sendCreatedRule();
                },
                onFinished: function (event, currentIndex) {
                    //console.log();
                    console.log('onFinished');
                    closePopAlert('.pop-alert-content');
                },
                onStepChanged: function (event, currentIndex, priorIndex) {
                    if( priorIndex === 0 ){
                        renderRulesetSections();

                        airlineGeoTagit();
                        airlineCompanyTagit();
                    }
                }
            });
        });
    };


    /*  Airline Geo
     *
     */
    var airlineGeoTagit = function () {
        var geoField = formWizard.find('.geographyField .tprGeography');

        var geoTagCode = '';
        var tagitInputGeo;
        var checkedInputGeo;

        var afterCreatedCallback = (function () {

            $('.tagit-choice').each(function () {
                var $currentTag = $(this);

                var currentGeoCode = $(this).data('geocode');

                if( !currentGeoCode ) {

                    $.each( formWizard.find('.condGeo'), function (item, value) {
                        if( $currentTag.find('#createRuleWizard .tagit-label').text() == $(value).text() ) {
                            $currentTag.data('geocode', $(value).data('geocode') );
                        }
                    })
                }
            });
        })();

        var serverResponse = '';
        geoField.tagit({
            autocomplete: {
                create: function( event, ui ) {
                    var ajaxLoader = '<i class="ajaxLoading fa fa-refresh fa-spin"></i>';
                    var $currentWidget = $('.tagit.ui-widget-content .tagit-new');
                    $currentWidget.append(ajaxLoader);
                    return false;
                },
                delay: 270,
                minLength: 3,
                source: function (req, res) {
                    geoTagCode = '';

                    console.log( newRuleType );
                    console.log(getTPGRCitiesAutocomplete,newRuleType,req.term);
                    var request = getTPGRCitiesAutocomplete[newRuleType] + req.term;

                    $.ajax({
                        dataType: 'json',
                        url: request,
                        success: function (data) {
                            serverResponse = data;

                            res( $.map( data, function ( item ) {

                                return {
                                    label:    item.label + ' (' + item.code + ')',
                                    value:    item.label,
                                    code:    item.code
                                }
                            }) );
                        }
                    });
                },
                select: function (event, ui) {
                    geoTagCode = ui.item.code;
                    geoField.tagit("createTag", ui.item.value);

                    return false;
                }
            },
            singleField: false,
            singleFieldDelimiter: '; ',
            beforeTagAdded: function (evt, ui) {
                if ( ui.duringInitialization === false ){
                    serverResponse = ( $.map( serverResponse, function ( city ) {
                        return city.label;
                    }) );

                    if ($.inArray(ui.tagLabel, serverResponse) == -1) {
                        return false;
                    }
                }

                $(ui.tag).data('geocode', geoTagCode);
            },
            afterCreated: afterCreatedCallback
        });

        checkedInputGeo = formWizard.find('.tpRuleField.geographyField input:checked');
        tagitInputGeo = formWizard.find('.tpRuleField.geographyField .tagit');

        if( checkedInputGeo.val() == 'cities' ) {
            tagitInputGeo.show()
        }

        formWizard.find('.tpRuleField.geographyField input[name="geography"]').on('change', function () {
            var isCities = $(this).val() == 'cities';
            var tagitListGeo = formWizard.find('.tpRuleField.geographyField .tagit');

            if( isCities ) {
                $( tagitListGeo ).show();
            } else {
                $( tagitListGeo ).hide();
            }
        });
    };

    /*  Airline Company
     *
     */
    var airlineCompanyTagit = function () {
        var tagitInputCompany;

        var companyField = $('.companyField .tprCompany');
        var companyCode  = '';
        var checkedInputCompany;

        var serverResponse = '';
        companyField.tagit({
            autocomplete: {
                create: function( event, ui ) {
                    var ajaxLoader = '<i class="ajaxLoading fa fa-refresh fa-spin"></i>';
                    var $currentWidget = $('.tagit.ui-widget-content .tagit-new');
                    $currentWidget.append(ajaxLoader);
                    return false;
                },
                delay: 270,
                minLength: 3,
                source: function (req, res) {
                    companyCode = '';

                    var request = '/index/airlineautocomplete?q=' + req.term;

                    $.ajax({
                        dataType: 'json',
                        url: request,
                        success: function (data) {
                            serverResponse = data;

                            res( $.map( data, function ( item ) {
                                return {
                                    label:    item.name + ' (' + item.code + ')',
                                    value:    item.name,
                                    code:    item.code
                                }
                            }) );
                        }
                    });
                },
                select: function (event, ui) {

                    companyCode = ui.item.code;
                    companyField.tagit("createTag", ui.item.value);

                    return false;
                }
            },
            singleField: false,
            singleFieldDelimiter: '; ',
            beforeTagAdded: function (evt, ui) {
                if ( ui.duringInitialization !== true ){
                    serverResponse = ( $.map( serverResponse, function ( company ) {
                        return company.name;
                    }) );

                    if ($.inArray(ui.tagLabel, serverResponse) == -1) {
                        return false;
                    }
                    $(ui.tag).data('companycode', companyCode);
                }
            }
        });

        checkedInputCompany = formWizard.find('.tpRuleField.companyField input:checked');
        tagitInputCompany = formWizard.find('.tpRuleField.companyField .tagit');

        if( checkedInputCompany.val() == 'companies' ) {
            tagitInputCompany.show()
        }

        formWizard.find('.tpRuleField.companyField input[name="company"]').on('change', function () {
            var isCompanies = $(this).val() == 'companies';
            var tagitListCompany   = formWizard.find('.tpRuleField.companyField .tagit');

            if( isCompanies ) {
                $( tagitListCompany ).show();
            } else {
                $( tagitListCompany ).hide();
            }
        });
    };



    var editorTitle =   'Создание правила';

    var popUpText   =   '<h2 class="ruleDescriptor" '
        +       'data-ruleId="0" '
        +       'data-ruleActive="0"'
        +   '>'
        +       editorTitle
        +   '</h2>';

    /* Wizard настройки правила >>> */
    var editorBody  =   '<div id="createRuleWizard">';

    /*  Меню типа правила >>> */
    editorBody  =  editorBody
        +       '<h3>Тип</h3>'
        +       '<section>'
        +           '<h4>Выберите тип правила</h4>';
    /*  Меню "Тип услуги"
     *  @return rTypeMenuList
     */
    var crTypeMenu = function () {
        var rTypeMenuList = '';
        var listItem = '';

        var ruleTypes = function (index, value) {
            listItem        = '<li data-ruleType="' + index + '">' + value.fieldName + '</li>';
            rTypeMenuList   = rTypeMenuList + listItem;
        };

        $.each(vocabulary, ruleTypes);

        rTypeMenuList = ''
            +   '<ul class="ruleType">'
            +       rTypeMenuList
            +   '</ul>';

        return rTypeMenuList;
    };

    editorBody  =  editorBody
        +           crTypeMenu()
        +       '</section>';
    /*  <<< Меню типа правила */

    /*  Настройка правила >>> */
    editorBody  =  editorBody
        +       '<h3>Правила</h3>'
        +       '<section style="text-align:left">'
        +           '<p>Краткая инструкция о том, что это за правила, которые нужно заполнять.</p>'
        +           '<p>О том, как связать созданные правила/группы правил и людей. О том, как оно отразится на работе в системе.</p>'
        +           '<p>Краткое описать приоритеты правил при прохождении заказа группы персон с разными уровнями прав.</p>'
        +           '<p>А так же напоминание, что созданные правила, по умоланию, не активны.</p>'
        +       '</section>';

    /* Форма типа правила */
    var renderAllRuleFieldsByType = function (ruleType) {
        //console.log(ruleLineDictionary[ruleType], newRuleType);

        var allRulesForms = [];

        $.each(ruleLineDictionary[ruleType], function ( index, value ) {
            //var fieldName = vocabulary[ruleType][value].fieldName;//
            var ruleField = this;

            var $ruleFieldSection = $(fieldEditorPopup[ruleType][ruleField]());
            $ruleFieldSection.find('input[type="reset"]').remove();
            $ruleFieldSection.find('input[type="submit"]').remove();

            var section =   '<h3></h3>'
                +   '<section>'
                +       '<h4>' + vocabulary[ruleType][value].fieldName + '</h4>'
                +       '<div  class="tpRuleField ' + value + 'Field">'
                +           $ruleFieldSection.html()
                +       '</div>'
                +   '</section>';

            //console.log(fieldName, ruleField, section );
            allRulesForms.push( section );
        });


        return allRulesForms;
    };

    editorBody  =  editorBody
        +       '</section>';
    /*  <<< Настройка правила */


    /*  <<< Wizard настройки правила */
    editorBody  =  editorBody
        +   '</div>';

    /*  Создание попапа с Wizard'ом */
    popAlert( popUpText + '' + editorBody );


    formWizard = $('#createRuleWizard');
    $(formWizard).on('click', function (event){
        event.stopPropagation();
    });

    $(formWizard).on('click', '.addInterval', rulesetMethods.addTimeInterval);
    $(formWizard).on('click', '.removeInterval', rulesetMethods.removeTimeInterval);

    $(formWizard).on('click', '.ruleType [data-ruletype]', function (event){
        event.stopPropagation();
        var $that = $(this);

        formWizard.find('.ruleType [data-ruletype]').removeClass('active');
        $that.addClass('active');

        newRuleType = $that.data('ruletype');
    });

    /*  Инициализация Wizard'а и валидатора полей >>> */
    if( scriptValidateIsLoaded === false ) {
        getValidateScript();
    }

    if( scriptStepsIsLoaded === false ){
        getStepsScript();
        scriptStepsIsLoaded = true;
    }
    /*  <<< Инициализация Wizard'а и валидатора полей */

    $('.pop-alert .close').on('click', function () {
        scriptValidateIsLoaded = false;
        scriptStepsIsLoaded    = false;
    });

};

$(document).ready(function () {

    var $mainPageContainer = $('#main-content');
    //$mainPageContainer.on('click', '.pop-alert-content', createRuleWizard);


    /* Ignore additional toolset links defaultEvents */
    $mainPageContainer.on('click', '.tprsTool', rulesetMethods.tpRuleSetTool );

    /* Any change of tpGroup name field will be transmitted immediately on server to save it */
    $('.tpGroup-create .tpName').on('change keyup blur', rulesetMethods.tpGroupNameChange);

    $mainPageContainer.on('click', '.tprsTool.showDeleted', rulesetMethods.showDeleted );
    $mainPageContainer.on('click', '.tprsTool.hideInactive', rulesetMethods.hideInactive );

    /*
     $tpRules.on('click', '.go', function () {
     var $this = $(this);

     var parentRow       = $this.parents('.tpRule.line');
     var tpRuleId        = parentRow.data('rule-id');
     var tpRuleActive    = parentRow.data('rule-active');

     var tpRuleCondsURL;
     var tpRuleCondsContent;

     var conditionsGetRequest;
     var getTPGRCondsURL = '/travelpolicy/getconds?rule_id=' + tpRuleId;

     conditionsGetRequest = $.ajax({
     type: 'GET',
     url: getTPGRCondsURL,

     processData: false,
     contentType: false,
     dataType: 'json',

     cache: false,
     error: function (e) {
     popAlert("Ошибка: <br /><br />" + e.error + "<br /><br />Обратитесь в тех.поддержку.");
     }
     });

     $.when(conditionsGetRequest)
     .done(function () {
     conditionsGetContent = JSON.parse(conditionsGetRequest.responseText);

     if( $.isEmptyObject(conditionsGetContent.conds) ) {
     $('.tpConds.row').html('<h4>Правила отсутствуют.</h4>');
     $('.tpConds.row').append('Добавить правило');
     } else {
     conditionsGetContent = conditionsGetContent.conds.conddescr;
     $('.tpConds.row').html('');
     }
     });

     });
     */

    /* Initially start of page load with rule load
     * @link /travelpolicy/edit
     *
     * Receiving all rules of group by it's ID
     * defined inside html page script block
     * @var tpGroupId
     */
    var realRequest = getRulesByTPGroupId(tpGroupId, 0);

    $.when(realRequest)
        .done(function (tpGroupRules) {
            var $tpRules = $('.tpRules');

            if (tpGroupRules.length === 0) {
                $tpRules.html('<h4>В данной группе еще нет правил</h4>');
            } else {
                var sortedTPRules = sortTPRulesByTypes(tpGroupRules);
                var htmlTPRulesetCollection = renderTPRulesetCollection(sortedTPRules);
                //$tpRules.html('<pre>' + htmlTPRulesetCollection + '</pre>');
                $tpRules.html( htmlTPRulesetCollection );
            }

            $tpRules.prepend('<a href="#" data-action="createRuleWizard">Создать новое правило</a>');
        });

    /* Submitted changes of given ruleField will be rendered on page immediately
     * TODO list
     *  - on case there is no changes was made do not allow to save it
     */
    $mainPageContainer.on('click', '.pop-alert-content .tpRuleField [type="submit"]', rulesetMethods.tprFieldEditionSubmit );

    /*  Add and remove interval methods of time range fields
     *  @var timeField
     */
    $mainPageContainer.on('click',
        '.pop-alert-content .tpRuleField.timeField .addInterval',
        rulesetMethods.addTimeInterval );

    $mainPageContainer.on('click',
        '.pop-alert-content .tpRuleField.timeField .removeInterval',
        rulesetMethods.removeTimeInterval);

    $mainPageContainer.on('click',
        '.tprsTool.newRule',
        rulesetMethods.createNewRuleInTypeset);
});

/*    Сохранение измененного правила и условий >>>
 *
 *    Части объекта tpgRuleset.{}
 *    Передаются back-end контроллеру
 *
 *    setTPGRuleURL = '/travelpolicy/setrule?rule_id=' + ruleId;
 *
 */
var setTravelPolicyRule = function (conditions) {
    var setTPRulesWaiter = $.Deferred();


    var ruleId    = conditions.ruleId;
    var ruleType  = conditions.ruleType;

    // var ruleField = conditions.ruleField;
    // var conds     = conditions.conds;

    var thisRule  = $.grep(tpgRuleset[ruleType], function ( rule ) {
        return rule.travel_policy_rule_id == ruleId;
    });

    thisRule = thisRule[0];

    /**
     var initialField = vocabulary[ruleType][ruleField]['fieldInitName'] || ruleField;
     var setFieldValue = vocabulary[ruleType][ruleField]['fieldParseToSave']( $(conds) );

     if( setFieldValue !== 'defaultValue' ) {
            thisRule['conditions'][initialField] = setFieldValue;
        } else {
            delete thisRule['conditions'][initialField];
        }
     */

    var ruleFormData = dataObjectToForm(thisRule);

    var setTPGRuleURL = '/travelpolicy/setrule?rule_id=' + ruleId;
    var ruleSetRequest;

    /* Обработчик ошибок и их статусов в $.AJAX запросах */
    var handleError = function (e) {
        var popMsg  =   'Ошибка: '
            +       '<br /><br /><pre>'
            +           e.status + ' — ' + e.statusText
            +       '</pre><br /><br />'
            +   'Обратитесь в тех.поддержку.';

        popAlert(popMsg);
        delLoader();
    };

    ruleSetRequest = $.ajax({
        type: 'POST',
        url: setTPGRuleURL,
        data: ruleFormData,

        processData: false,
        contentType: false,
        cache: false,
        success: function(res){
            res = JSON.parse(res);

            if(res.error){
                res.status = '501: Проблемы сохранения данных на сервере';
                res.statusText = res.error;

                handleError(res);
            }
        },
        error: handleError
    });

    $.when(ruleSetRequest)
        .done(function () {
            var updatedRule = renderTPRuleConditions(thisRule);
            $('[data-ruleid='+ ruleId +'][data-id=rsCondition]').html(updatedRule);
        });

    return setTPRulesWaiter.promise();
};
//    <<< Сохранение измененного правила и условий

var setTravelPolicyShortRule = function (conditions) {
    //console.log( conditions );

    var ruleType   = conditions.ruleType;
    var ruleId     = conditions.ruleId;

    var thisRule;

    if (ruleId === 0) {
        thisRule = {
            conditions: {},

            travel_policy_rule_id: ruleId,
            travel_policy_rule_type: ruleType,

            travel_policy_rule_active: 0,
            travel_policy_rule_group_id: tpGroupId,

            travel_policy_rule_name: conditions.ruleName,
            travel_policy_rule_to_delete: 0
        }
    } else {
        thisRule = $.grep(tpgRuleset[ruleType], function (rule) {
            return rule.travel_policy_rule_id == ruleId;
        });
        thisRule = thisRule[0];
    }

    var ruleFormData = dataObjectToForm(thisRule);

    var setTPGRuleShortURL = '/travelpolicy/setruleshort?rule_id=' + ruleId;
    var ruleSetShortRequest;

    ruleSetShortRequest = $.ajax({
        type: 'POST',
        url: setTPGRuleShortURL,
        data: ruleFormData,

        processData: false,
        contentType: false,
        cache: false,
        error: function (e) {
            var popMsg = ''
                +   'Ошибка: '
                +       '<br /><br /><pre>'
                +           e.status + ' — ' + e.statusText
                +       '</pre><br /><br />'
                +   'Обратитесь в тех.поддержку.';

            popAlert(popMsg);
            //console.log(e);
        }
    });

    $.when(ruleSetShortRequest)
        .done(function () {
            var updatedRule = renderTPRuleConditions(thisRule);
            $('[data-ruleid='+ ruleId +'][data-id=rsCondition]').html(updatedRule);
        });
};
//    <<< Сохранение ТОЛЬКО ШАПКИ измененного правила

var renderTravelPolicyRule = function (conditions) {
    var ruleId    = conditions.ruleId;
    var ruleType  = conditions.ruleType;

    var ruleField = conditions.ruleField;

    var conds     = conditions.conds;


    var thisRule  = $.grep(tpgRuleset[ruleType], function ( rule ) {
        return rule.travel_policy_rule_id == ruleId;
    });
    thisRule = thisRule[0];

    var initialField = vocabulary[ruleType][ruleField]['fieldInitName'] || ruleField;
    var setFieldValue = vocabulary[ruleType][ruleField]['fieldParseToSave']( $(conds) );

    if (setFieldValue === 'defaultValue') {
        delete thisRule['conditions'][initialField];
    } else {
        thisRule['conditions'][initialField] = setFieldValue;
    }

    var updatedRule = renderTPRuleConditions(thisRule);
    $('[data-ruleid='+ ruleId +'][data-id=rsCondition]').html(updatedRule);

};

/*    Сортировка массива правил группы по типам >>>
 *    Авиа/ЖД/Отели/...
 *
 *    @param {tpGroupRules} tpGroupRules
 *    @return {sortedTPRulesByType}
 *
 */
var sortTPRulesByTypes = function (tpGroupRules) {
    var sortedTPRulesByType = [];
    var tpGRType;

    for( var i = 0; i < tpGroupRules.length; i++ ) {
        tpGRType = tpGroupRules[i].travel_policy_rule_type;

        if( !($.isArray(sortedTPRulesByType[tpGRType])) ) {
            sortedTPRulesByType[tpGRType] = []
        }

        sortedTPRulesByType[tpGRType].push(tpGroupRules[i]);
    }

    return sortedTPRulesByType;
};
//    <<< Сортировка массива правил группы

var renderTPRulesetCollection = function (rulesetCollection) {
    tpgRuleset = rulesetCollection;

    /* Инстрменты правил над\под списком в группе правил по типу */
    var conditionsToolset = ''
        +   '<div class="conditionsToolset">'

        +       '<a href="#" class="tprsTool showDeleted">'
        +           'Показать удаленные'
        +       '</a>'

        +       '<a href="#" class="tprsTool hideInactive">'
        +           'Скрыть неактивные'
        +       '</a>'
        +   '</div>';

    var htmlTemplate = '';
    for (var rulesetName in rulesetCollection) {
        if( rulesetCollection.hasOwnProperty(rulesetName) ) {
            htmlTemplate = htmlTemplate
                + '<div class="tpRuleset" data-ruleType="' + rulesetName + '">'
                +   '<h3>'
                +       vocabulary[rulesetName].fieldName + ' - '
                +       rulesetCollection[rulesetName].length + ' правил'
                +   '</h3>'

                +   conditionsToolset

                +   '<div class="debug">'
                +       renderTPRuleset(rulesetName, rulesetCollection[rulesetName])
                +   '</div>'

                +   conditionsToolset

                + '</div>';
        }
    }

    return htmlTemplate;
};

var renderTPRuleset = function (rulesetName, ruleset) {

    var htmlTemplate = '';

    for( var rulesetCounter = 0; rulesetCounter < ruleset.length; rulesetCounter++) {

        htmlTemplate = htmlTemplate
                /*
                 + '<table data-id="rsCounter' + rulesetCounter + '">'
                 + '    <thead class="header">'
                 + '        <tr>'// class="header">'
                 + '            <th class="col-sm-1">id</th>'
                 + '            <th class="col-sm-2">name</th>'
                 + '            <th class="col-sm-1">Gid</th>'
                 + '            <th class="col-sm-1">Active</th>'
                 + '            <th class="col-sm-1">cDate</th>'
                 + '            <th class="col-sm-1">rType</th>'
                 + '            <th class="col-sm-5">Condition</th>'
                 + '        </tr>'
                 + '    </thead>'
                 + '    <tbody>'
                 + '        ' + renderTPRuleInfo(ruleset[rulesetCounter])
                 + '        <tr><td>' + rulesetCounter + ' --- ' + ruleset[rulesetCounter] + '</td></tr>'
                 + '    </tbody>'
                 + '</table>'
                 + '<br>'
                 */
            + renderTPRuleConditions(ruleset[rulesetCounter]);
    }

    return htmlTemplate;
};

/*
 var renderTPRuleInfo = function (tpRule) {

 var htmlTemplate = '';
 htmlTemplate = htmlTemplate
 + '        <tr>'
 + '            <td>' +    tpRule.travel_policy_rule_id + '</td>'
 + '            <td>' +    tpRule.travel_policy_rule_name + '</td>'
 + '            <td>' +    tpRule.travel_policy_rule_group_id + '</td>'
 + '            <td>' +    tpRule.travel_policy_rule_active + '</td>'
 + '            <td>' +    tpRule.travel_policy_rule_create_date + '</td>'
 + '            <td>' +    tpRule.travel_policy_rule_type + '</td>'
 + '            <td>' +    dump(tpRule.conditions) + '</td>'
 + '        </tr>';

 return htmlTemplate;
 };
 */

/* on page variable to store cities data for @condGeography */
// var citiesWeDontHave = {};
/* Создание словаря страницы */
var pageCityDict = {};
pageCityDict.avia = {};
pageCityDict.avia.companies = {};
pageCityDict.avia.cities = {};

pageCityDict.train = {};
pageCityDict.train.companies = {};
pageCityDict.train.cities = {};

pageCityDict.hotel = {};
pageCityDict.hotel.companies = {};
pageCityDict.hotel.cities = {};

var getTPGRCitiesURL        = {};
getTPGRCitiesURL.avia   = '/index/getAirportNames?signs=';
getTPGRCitiesURL.train  = '/index/stationsautocomplete?q=';
getTPGRCitiesURL.hotel  = '/index/airportautocomplete';

// var getCondGeoContent;
// var getCondGeoRequest;

/*
 var condGeographyList = function (geoVar, condType) {

 var getCityWaiter = $.Deferred();
 getCondGeoRequest = $.ajax({
 type: 'GET',
 url: getTPGRCitiesURL[condType] + geoVar,
 dataType: 'json',
 cache: false,
 error: function (e) {
 popAlert("Ошибка: <br /><br />" + e.error + "<br /><br />Обратитесь в тех.поддержку.");
 }
 });

 $.when(getCondGeoRequest)
 .then(function (respObj, respStatus, resp) {
 var geoCode;
 var geoName;

 getCondGeoContent = JSON.parse(resp.responseText);
 getCityWaiter.resolve(getCondGeoContent);

 if( pageCityDict[condType] ) {
 if( condType == 'avia' ) {
 geoCode = getCondGeoContent[0].airport_code_iata;
 geoName = getCondGeoContent[0].airport_name_ru;

 pageCityDict[condType][geoCode] = geoName;
 }
 }
 });

 return getCityWaiter.promise();
 };
 */
/*
 var sortConditionsOrder = function (conditionsArray) {

 var sortConditionsObject = {};

 sortConditionsObject['class'] = '';
 sortConditionsObject['time'] = '';
 sortConditionsObject['elapsed'] = '';
 sortConditionsObject['priceMin'] = '';
 sortConditionsObject['priceMax'] = '';
 sortConditionsObject['geography'] = '';
 sortConditionsObject['company'] = '';
 sortConditionsObject['transfer'] = '';

 var condName;
 var condValue;

 for( var cond = 0; cond < conditionsArray.length; cond++ ) {
 condName    = conditionsArray[cond].name;
 condValue    = conditionsArray[cond].value;

 sortConditionsObject[condName] = ( condValue !== null ? condValue : '' );
 }

 return conditionsArray;
 }
 */

var rulesSetContent;
var rulesSetRequest;

var getRulesByTPGroupId = function (groupId, type) {
    var getRulesURL = '/travelpolicy/getrules?group_id=' + groupId;
    var getRulesWaiter = $.Deferred();

    if( type !== 0 ) addLoader();

    rulesSetRequest = $.ajax({
        type: 'GET',
        url: getRulesURL,

        processData: false,
        contentType: false,
        dataType: 'json',
        cache: false,
        error: function (e) {
            if( type !== 0 ) delLoader();
            var popMsg  =   'Ошибка: '
                +       '<br>'
                +           e.error
                +       '<br>'
                +   'Обратитесь в тех.поддержку.';

            popAlert(popMsg);
        }
    });

    $.when(rulesSetRequest)
        .done(function () {
            rulesSetContent = JSON.parse(rulesSetRequest.responseText);
        })
        .then(function () {
            getRulesWaiter.resolve(rulesSetContent);
        });

    return getRulesWaiter.promise();
};

/*
 var changeTPolicyActivity = function (groupId) {
 var that = $('#tp_' + groupId);

 var groupName = tpGroupName;
 var groupToDelete = tpGroupActive ? '1':'0';

 $.when( setTravelPolicyGroup(companyId, groupId, groupName, groupToDelete, 0) )
 .done(function () {
 $('.dr-button.activeState').addClass(function () {
 var that = $(this);

 that.removeClass('bgreen c-bgc-red');
 that.children('a').text( tpGroupActive ? 'Включить' : 'Выключить' );

 return ( tpGroupActive ? that.addClass('bgreen') : that.addClass('c-bgc-red') );
 });

 $('.tpGroup-info .activeState, .tpGroup-create .activeState').addClass(function () {
 var that = $(this);
 that.removeClass('btn-green btn-red');
 that.text( !tpGroupActive ? 'активно' : 'не активно' );

 return ( !tpGroupActive ? that.addClass('btn-green') : that.addClass('btn-red') );
 });

 tpGroupActive = !tpGroupActive;
 });
 }
 */
var setTravelPolicyGroup = function (companyId, groupId, groupName, groupToDelete, type) {
    if( type !== 0 ) addLoader();

    var formData = new FormData();
    formData.append('company_id',    companyId);
    formData.append('group_id',        groupId);
    formData.append('group_name',    groupName);
    formData.append('to_delete',    groupToDelete);

    var getTPGroupsURL = '/travelpolicy/setgroup?company_id=' + companyId;

    return $.ajax({
        type: 'POST',

        url: getTPGroupsURL,
        processData: false,
        contentType: false,
        data: formData,

        cache: false,
        error: function (e) {
            if( type !== 0 ) delLoader ();
            var popMsg  =   'Ошибка: '
                +       '<br /><br />'
                +           e.error
                +       '<br /><br />'
                +   'Обратитесь в тех.поддержку.';

            popAlert(popMsg);
        }
    });
};

/*
 var editTPolicy = function (tpGroupId) {
 window.location.href = '/travelpolicy/edit?group_id=' + tpGroupId;
 };
 */
var saveTPolicy = function (tpGroupId) {
    var groupId         = tpGroupId;
    var groupName       = $('.tpName input').val();
    var tpGroupActive   = $('.tpGroup .active');
    var groupToDelete   = tpGroupActive ? 0 : 1;

    return $.when( setTravelPolicyGroup(companyId, groupId, groupName, groupToDelete, 0) );
};

/** Next work
 *  TODO list2
 *    — объект группы ТП
 *        Переписать функционал на хранимый в переменной объект группы ТП,
 *        её правил и условий.
 *
 *        Парсить из него и в него
 *
 *    — Использовать var result = $.grep()
 *
 *      $.grep(myArray, function (e) {
 *          return e.travel_policy_rule_id === 89;
 *      });
 *
 *    — Собрать словари
 *        методово отрисовки,
 *        сохранения и
 *        соответствия полей/значений
 *    под единый набор ЧПП
 *
 *    Продумать/ввести
 *        default-обработчики и
 *        обобщенные обработчики (для priceMin/priceMax и т.д.)
 **/
$(document).ready(function () {
    var $tpRules = $('.tpRules');

    /* Click on every condition cell in ruleLine
     * except ruleAction cell
     * made editConditionPopUp action
     */
    $tpRules.on('click', '[data-ruleid] td:not(.tpRuleActions)', editConditionPopUp );

    /* Click on every object in ruleLine action cell
     * makeSomeRulelineAction
     */
    $tpRules.on('click', '[data-ruleid] td.tpRuleActions', makeSomeRulelineAction);

    /* Click on createRuleWizard link
     * starts Rule Wizard
     */
    $tpRules.on('click', '[data-action=createRuleWizard]', createRuleWizard);
});

var parseHTMLhelper = function ( htmlType, htmlData, htmlIndex, ruleId, ruleName, ruleActive, ruleToDelete ) {
    var ruleType = ruleLineDictionary[htmlType][htmlIndex];

    return {
        type:    htmlType,
        field:    ruleType,
        data:    htmlData,
        index:    htmlIndex,

        ruleId:         ruleId,
        ruleName:         ruleName,
        ruleActive:     ruleActive,
        ruleToDelete:    ruleToDelete,

        ruleType:        htmlType,
        ruleField:        ruleType
    };
};


/*    Метод format конструктора Number >>>
 *    Расширение прототипа
 *
 *    Метод позволяет задавать число знаков после запятой и
 *    Вводить знак валют до или после значения.
 *
 *    Пример работы:    (123456789.12345).format(2, 2, '—', '=')
 *        возвращает:    1—23—45—67—89=12
 *
 *    Похожие решения описаны тут:
 *    http://stackoverflow.com/q/149055/
 *
 *    Все экземпляры Number наследуются от Number.prototype.
 */
Number.prototype.format = function (n, x, s, c) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')';
    var num = this.toFixed(Math.max(0, ~~n));

    return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};
//    <<< Метод format конструктора Number

/*    Метод "размера" Object() >>>
 *    Аналог someArray.length
 *
 *    Не через прототип, ибо:
 *    http://stackoverflow.com/q/10757455/
 */
Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};
//    <<< Метод "размера" Object()

//    Метод переименования ключей объекта >>>
Object.renameProperty = function (oldName, newName) {
    // Do nothing if the names are the same
    if (oldName == newName) {
        return this;
    }
    // Check for the old property name to avoid a ReferenceError in strict mode.
    if (this.hasOwnProperty(oldName)) {
        this[newName] = this[oldName];
        delete this[oldName];
    }
    return this;
};
//    <<< Метод переименования ключей объекта

/*    Функция рендера Object() >>>
 *
 *    На подобии print_r() в PHP
 *
 *    @renderTPRuleInfo
 *    @popUpText
 */
function dump(arr,level) {
    var dumped_text = "";
    if(!level) level = 0;

    //The padding given at the beginning of the line.
    var level_padding = "";
    for(var j=0;j<level+1;j++) level_padding += "    ";

    if(typeof(arr) == 'object') { //Array/Hashes/Objects
        for(var item in arr) {
            if( arr.hasOwnProperty(item) ) {
                var value = arr[item];

                if (typeof(value) == 'object') { //If it is an array,
                    dumped_text += level_padding + "'" + item + "' ...\n";
                    dumped_text += dump(value, level + 1);
                } else {
                    dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
                }
            }
        }
    } else { //Stings/Chars/Numbers etc.
        dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
    }
    return dumped_text;
}
//    <<< Функция рендера Object()

/*    Функции для слайдера интервальных значений >>>
 *    (продолжительность перелета/поездки/заселения/...)
 *
 *    Определяет, с каким нажатием слайдера мы имеем дело,
 *    т.к., по умолчанию, все объекты внутри него -
 *    указатель интервала.
 *
 *    Функция введена ради крестика удаления интервала.
 */
var disableSliderTrack = function ($slider) {
    var mouseClickEventHandler = function (event) {
        return isTouchInSliderHandle($(this), event);
    };

    var touchStartEventHandler = function (event) {
        return isTouchInSliderHandle($(this), event.originalEvent['touches'][0]);
    };

    $slider.bind('mousedown', mouseClickEventHandler);
    $slider.bind('touchstart', touchStartEventHandler);
};

var isTouchInSliderHandle = function ($slider, coords) {
    var x = coords.pageX;
    var y = coords.pageY;

    var $handle = $slider.find('.ui-slider-handle');

    var left = $( $handle[0] ).offset().left;
    var right = $( $handle[1] ).offset().right;
    var top = $( $handle[0] ).offset().top;
    var bottom = $( $handle[0] ).outerHeight();

    return (x >= left && x <= right && y >= top && y <= bottom);
};
//    <<< Функции для слайдера интервальных значений

//    >>> Добавил метод присоединения стилей на подобии $.getScript
(function($) {
    $.getStylesheet = function (href) {
        var $d = $.Deferred();
        var $link = $('<link/>', {
            rel: 'stylesheet',
            type: 'text/css',
            href: href
        }).appendTo('head');
        $d.resolve($link);
        return $d.promise();
    };
})(jQuery);
//    <<< Добавил метод присоединения стилей на подобии $.getScript

/* Conversion method to transform dataObject to FormData
 *
 * @var dataObject
 * @var FormData
 *
 * @return ruleFormData
 */
var dataObjectToForm = function(dataObject){

    var ruleFormData = new FormData();

    /*
     var objectPairsToDelimitedFormStrings = function(subObject){
     var objName = '';
     var objValue = '';

     var cities = '';

     $.each(subVal, function ( subValKey, subValVal ) {
     cities = cities + subValKey + ';';
     });

     ruleFormData.append('condition['+ conditionKey + '][value]', "cities");
     ruleFormData.append('condition['+ conditionKey + '][cities]', cities);
     };
     */
    /* Condition Object (cities/companies/geography) contain
     * Value as an Object
     * conversion method to dataObject
     * object {subKey, subValue} to
     * condition[conditionKey][subKey] = subVal
     *
     *  // conditionKey, subKey, subVal, formDataObject
     */
    /*
     var conditionIsAnObject = function (subKey, subVal, conditionKey) {

     if( subKey == 'cities' ) {

     var cities = '';

     $.each(subVal, function ( subValKey, subValVal ) {
     cities = cities + subValKey + ';';
     });

     ruleFormData.append('condition['+ conditionKey + '][value]', "cities");
     ruleFormData.append('condition['+ conditionKey + '][cities]', cities);
     }

     if( subKey == 'companies' ) {
     var companies = '';

     if( Object.size(subVal) ) {
     $.each(subVal, function ( subValKey, subValVal ) {
     companies = companies + subValKey + ';';
     });
     }

     ruleFormData.append('condition['+ conditionKey + '][value]', "companies");
     ruleFormData.append('condition['+ conditionKey + '][companies]', companies);
     }

     if( subKey == 'geography' ) {
     var geography = '';

     $.each(subVal, function ( subValKey, subValVal ) {
     geography = geography + subValKey + ';';
     });

     ruleFormData.append('condition['+ conditionKey + '][value]', "geography");
     ruleFormData.append('condition['+ conditionKey + '][geography]', geography);
     }
     };
     */
    for( var key in dataObject ) {

        /* If it's not conditions object then it's rule's header values paired */
        if( dataObject.hasOwnProperty(key) && key !== 'conditions' ) {
            ruleFormData.append(key, dataObject[key]);
        } else {
            var joinedData = $.makeArray( dataObject[key] );
            joinedData = joinedData[0];

            var conditionsConversionIterator = function (conditionKey,conditionVal) {

                /* If it's condition value object such as companies/geography
                 * which contains name and value pair...
                 */
                if( typeof conditionVal === "object" ) {

                    /* Convert Object {a: {name: "one", value: "1"}, b: {name: "two", value: "2"} } to
                     * condition[conditionKey][a][name] = one, condition[conditionKey][a][value] = 1...
                     * FormData Object
                     * @
                     */
                    var conditionIsAnObject = function (subKey, subVal) {

                        if( subKey == 'cities' ) {

                            var cities = '';

                            $.each(subVal, function ( subValKey ) {
                                cities = cities + subValKey + ';';
                            });

                            ruleFormData.append('condition['+ conditionKey + '][value]', "cities");
                            ruleFormData.append('condition['+ conditionKey + '][cities]', cities);
                        }

                        if( subKey == 'companies' ) {
                            var companies = '';

                            if( Object.size(subVal) ) {
                                $.each(subVal, function ( subValKey ) {
                                    companies = companies + subValKey + ';';
                                });
                            }

                            ruleFormData.append('condition['+ conditionKey + '][value]', "companies");
                            ruleFormData.append('condition['+ conditionKey + '][companies]', companies);
                        }

                        if( subKey == 'geography' ) {
                            var geography = '';

                            $.each(subVal, function ( subValKey ) {
                                geography = geography + subValKey + ';';
                            });

                            ruleFormData.append('condition['+ conditionKey + '][value]', "geography");
                            ruleFormData.append('condition['+ conditionKey + '][geography]', geography);
                        }

                    };

                    $.each(conditionVal, conditionIsAnObject);

                    /* Objected conditionType value
                     * like companies/geography/cities
                     * can contain nonObject values
                     */
                    if( Object.size(conditionVal) == 1 && conditionVal.value !== 'defaultValue' ) {
                        ruleFormData.append( 'condition['+ conditionKey + '][value]', conditionVal.value );
                    }

                    /* Objected conditionType like companies/geography/
                     * like companies/geography/cities
                     * can contain defaultValue state
                     */
                    if( conditionVal.value == 'defaultValue' || $.isEmptyObject(conditionVal.value) ) {
                        ruleFormData.append( 'condition['+ conditionKey + '][value]', '' );
                    }

                } else {
                    ruleFormData.append('condition['+ conditionKey + ']', conditionVal);
                }
            };

            $.each(joinedData, conditionsConversionIterator);
        }
    }

    return ruleFormData;
};





/*  Шаблонизатор списков правил по типам в таблицы */
var renderTPRuleConditions = function (tpRule) {
//console.log(tpRule);

    var tpRuleId;
    var tpRuleType;

    var tpRuleName;
    var tpRuleActivity;
    var tpRuleToDelete;

    var tpRuleConditions;


    tpRuleId            = tpRule.travel_policy_rule_id;
    tpRuleType          = tpRule.travel_policy_rule_type;

    tpRuleName          = tpRule.travel_policy_rule_name;
    tpRuleActivity      = tpRule.travel_policy_rule_active;
    tpRuleToDelete      = tpRule.travel_policy_rule_to_delete;

    tpRuleConditions    = tpRule.conditions;

    var conditions = tpRule.conditions || {};
    conditions.condType = tpRule.travel_policy_rule_type;


    return renderTPRuleConditions[conditions.condType]({
        conditions: conditions,
        rule: {
            tpRuleId:           tpRuleId,
            tpRuleActivity:     tpRuleActivity,
            tpRuleToDelete:     tpRuleToDelete,

            tpRuleType:         tpRuleType,
            tpRuleName:         tpRuleName,

            tpRuleConditions:   tpRuleConditions
        }
    });
};

/*  Правила рендера таблицы условий АВИА  */
renderTPRuleConditions.avia    = function (ruleObject) {
    var htmlTemplate = '';

//console.log(ruleObject);
    var conditions        = ruleObject.conditions;
    var tpRule            = ruleObject.rule;

    var tpRuleId        = tpRule['tpRuleId'];
    var tpRuleName      = tpRule['tpRuleName'];
    var tpRuleActivity  = tpRule['tpRuleActivity'];
    var tpRuleToDelete  = tpRule['tpRuleToDelete'];

    var condType        = conditions['condType'];
    var condGrade       = conditions['class'] || {};
    var condTime        = conditions['time'] || {};
    var condElapsed     = conditions['elapsed'] || {};
    var condPriceMin    = conditions['priceMin'] || {};
    var condPriceMax    = conditions['priceMax'] || {};
    var condGeography   = conditions['geography'] || {};
    var condCompany     = conditions['company'] || {};
    var condTransfer    = conditions['transfer'] || {};

    if ($.isEmptyObject(condGrade)) {
        condGrade = vocabulary[condType].grade['defaultValue'];
    } else {
        condGrade = vocabulary[condType].grade[condGrade];
    }

    if ($.isEmptyObject(condTime)) {
        condTime = vocabulary[condType].time['defaultValue'];
    } else {
        condTime = condTime.split(';');

        for (var i = 0; i < condTime.length; i++) {
            condTime[i] = '<span class="tprTimer">'
                + '<i class="tprTime timeStart">'
                + condTime[i].substring(0, 2) + ':' + condTime[i].substring(2, 4)
                + '</i>'
                + '—'
                + '<i class="tprTime timeEnd">'
                + condTime[i].substring(4, 6) + ':' + condTime[i].substring(6, 8)
                + '</i>'
                + '</span>';
        }

        condTime = $.makeArray(condTime).join('');
    }

    if ($.isEmptyObject(condElapsed)) {
        condElapsed = vocabulary[condType].elapsed['defaultValue'];
    } else {
        condElapsed = (Math.floor(condElapsed / 60)) + '&nbsp;ч. ' + (condElapsed % 60) + '&nbsp;м.'
    }

    if ($.isEmptyObject(condPriceMin)) {
        condPriceMin = vocabulary[condType].priceMin['defaultValue'];
    } else {
        if (condPriceMin === 'min') {
            condPriceMin = vocabulary[condType].priceMin[condPriceMin];
        } else {
            condPriceMin = Number(condPriceMin).format(0, 3, '&nbsp', '.') + '<i class="fa fa-rub"></i>';
        }
    }

    if ($.isEmptyObject(condPriceMax)) {
        condPriceMax = vocabulary[condType].priceMax['defaultValue'];
    } else {
        if (condPriceMax === 'min') {
            condPriceMax = vocabulary[condType].priceMax[condPriceMax];
        } else {
            condPriceMax = Number(condPriceMax).format(0, 3, '&nbsp;', '.') + '<i class="fa fa-rub"></i>';
        }
    }

    /* condGeography is "not cities list" state by default */

    /* if condGeography is geography list
     * replace «cities» &&
     * turn isCities flag ON */

    if ($.isEmptyObject(condGeography)) {
        condGeography = vocabulary[condType].geography['defaultValue'];
    } else {

        if (condGeography.value == 'cities') {

            if (Object.size(condGeography.cities)) {
                condGeography = condGeography.cities;
                var htmlCondeGeo;

                condGeography = Object.keys(condGeography).map(function (city) {
                    /* Наполнение словаря страницы */
                    pageCityDict.avia.cities[city] = condGeography[city];

                    htmlCondeGeo = ''
                        + '<i class="condGeo" data-geoCode="' + city + '">'
                        + condGeography[city]
                        + '</i>';

                    return htmlCondeGeo;
                }).join('');

            } else {
                condGeography = vocabulary[condType].geography['defaultValue'];
            }

        } else {

            if (condGeography.value === '') {
                condGeography = vocabulary[condType].geography['defaultValue'];
            } else {
                condGeography = vocabulary[condType].geography[condGeography.value];
            }
        }
    }

    if ($.isEmptyObject(condCompany)) {
        //console.log(condCompany);
        condCompany = vocabulary[condType].company['defaultValue'];
    } else {

        if (condCompany.value == 'companies') {

            if (Object.size(condCompany.companies)) {
                var htmlCondComp;

                var transformCityObjectToHTML = function (company) {
                    /* Наполнение словаря страницы */
                    pageCityDict.avia.companies[company] = condCompany[company];

                    htmlCondComp = ''
                        +   '<i class="condComp" data-companyCode="' + company + '" >'
                        +       condCompany[company]
                        +   '</i>';
                    return htmlCondComp;
                };

                condCompany = condCompany.companies;
                condCompany = Object.keys(condCompany).map(transformCityObjectToHTML).join('');

            } else {
                condCompany = vocabulary[condType].company['defaultValue'];
            }

        } else {

            if (condCompany.value === '') {
                condCompany = vocabulary[condType].company['defaultValue'];
            } else {
                condCompany = vocabulary[condType].company[condCompany.value];
            }
        }
    }

    if ($.isEmptyObject(condTransfer)) {
        condTransfer = vocabulary[condType].transfer['defaultValue'];
    } else {
        condTransfer = vocabulary[condType].transfer[condTransfer];
    }

    htmlTemplate = htmlTemplate
    + '<table data-id="rsCondition" data-ruleId="'      + tpRuleId       + '" '
    +                              'data-ruleactive="'  + tpRuleActivity + '" '
    +                              'data-ruledeleted="' + tpRuleToDelete + '">'
    +     '<thead class="header">'
    +         '<tr>' // class="header"style="background-color:#B7D6DE">'
    +             '<th class="col-sm-1 tprcGrade">' + vocabulary[condType].grade.fieldName + '</th>'
    +             '<th class="col-sm-1 tprcTime">' + vocabulary[condType].time.fieldName + '</th>'
    +             '<th class="col-sm-1 tprcElapsed">' + vocabulary[condType].elapsed.fieldName + '</th>'
    +             '<th class="col-sm-1 tprcPriceMin">' + vocabulary[condType].priceMin.fieldName + '</th>'
    +             '<th class="col-sm-1 tprcPriceMax">' + vocabulary[condType].priceMax.fieldName + '</th>'
    +             '<th class="col-sm-1 tprcGeography">' + vocabulary[condType].geography.fieldName + '</th>'
    +             '<th class="col-sm-1 tprcCompany">' + vocabulary[condType].company.fieldName + '</th>'
    +             '<th class="col-sm-1 tprcTransfer">' + vocabulary[condType].transfer.fieldName + '</th>'
    +             '<th class="col-sm-4 tprControl"></th>'
    +         '</tr>'
    +     '</thead>'
    +     '<tbody>'
    +         '<tr data-ruleId="' + tpRuleId + '" '
    +              'data-ruleName="' + tpRuleName + '" '
    +              'data-ruleActive="' + tpRuleActivity + '" '
    +              'data-ruleDeleted="' + tpRuleToDelete + '">'

    +             '<td>' + condGrade + '</td>'
    +             '<td>' + condTime + '</td>'
    +             '<td>' + condElapsed + '</td>'
    +             '<td>' + condPriceMin + '</td>'
    +             '<td>' + condPriceMax + '</td>'
    +             '<td>' + condGeography + '</td>'
    +             '<td>' + condCompany + '</td>'
    +             '<td>' + condTransfer + '</td>'

    +             '<td class="tpRuleActions">'
    +               '<div class="slideButton">'
    +                 '<input type="hidden" name="tpgRule_' + tpRuleId + '_active" value="' + tpRuleActivity + '">'
    +                 '<input  type="checkbox" '
    +                         'id="tpRule_' + tpRuleId +'_active" '
    +                         'class="slide" '
    +                         'name="tpRule_' + tpRuleId + '_active" '
    +                        ( tpRuleActivity ? 'checked="checked"' : '' ) + ' '
    +                         'value="' + tpRuleActivity + '" '
    +                 '>'
    +                 '<label class="slide-label" for="tpRule_' + tpRuleId + '_active"></label>'
    +               '</div>'

    +               '<div class="dr-button" data-action="removeRule" ' + (!tpRuleToDelete ? '': 'disabled') + '>Удалить</div>'
    +               '<div class="dr-button" data-action="restoreRule" ' + (tpRuleToDelete ? '': 'disabled') + '>Восстановить</div>'

    +               '<div class="dr-button bgreen" data-action="saveChanges" disabled>Сохранить</div>'
    +               '<div class="dr-button-grey" data-action="cancelChanges" disabled>Отменить</div>'
    +             '</td>'

    +         '</tr>'
    +     '</tbody>'
    + '</table>';

    return htmlTemplate;
};

/*  Правила рендера таблицы условий ЖД  */
renderTPRuleConditions.train    = function (ruleObject) {
    var htmlTemplate = '';


    var conditions        = ruleObject.conditions;
    var tpRule            = ruleObject.rule;

    var tpRuleId          = tpRule['tpRuleId'];
    var tpRuleName        = tpRule['tpRuleName'];
    var tpRuleActivity    = tpRule['tpRuleActivity'];
    var tpRuleToDelete    = tpRule['tpRuleToDelete'];

    var condType          = conditions['condType'];



    var condGrade         = conditions['class'] || {};

    var condDepartureTime = conditions['departureTime'] || {};
    var condDuration      = conditions['duration'] || {};

    var condGeography   = conditions['geography'] || {};

    var condPriceMin    = conditions['priceMin'] || {};
    var condPriceMax    = conditions['priceMax'] || {};



    if ($.isEmptyObject(condGrade)) {
        condGrade = vocabulary[condType].grade['defaultValue'];
    } else {
        condGrade = vocabulary[condType].grade[condGrade];
    }


    if ($.isEmptyObject(condDepartureTime)) {
        condDepartureTime = vocabulary[condType].time['defaultValue'];
    } else {
        condDepartureTime = condDepartureTime.split(';');

        for (var i = 0; i < condDepartureTime.length; i++) {
            condDepartureTime[i] = '<span class="tprTimer">'
                + '<i class="tprTime timeStart">'
                + condDepartureTime[i].substring(0, 2) + ':' + condDepartureTime[i].substring(2, 4)
                + '</i>'
                + '—'
                + '<i class="tprTime timeEnd">'
                + condDepartureTime[i].substring(4, 6) + ':' + condDepartureTime[i].substring(6, 8)
                + '</i>'
                + '</span>';
        }

        condDepartureTime = $.makeArray(condDepartureTime).join(', ');
    }

    if ($.isEmptyObject(condDuration)) {
        condDuration = vocabulary[condType].elapsed['defaultValue'];
    } else {
        condDuration = condDuration.split(';');

        for (var i = 0; i < condDuration.length; i++) {
            condDuration[i] = '<span class="tprTimer">'
                + '<i class="tprTime timeStart">'
                + condDuration[i].substring(0, 2) + ':' + condDuration[i].substring(2, 4)
                + '</i>'
                + '—'
                + '<i class="tprTime timeEnd">'
                + condDuration[i].substring(4, 6) + ':' + condDuration[i].substring(6, 8)
                + '</i>'
                + '</span>';
        }

        condDuration = $.makeArray(condDuration).join('');
    }

    
    /* if condGeography is geography list
     * replace «cities» &&
     * turn isCities flag ON */
    if ($.isEmptyObject(condGeography)) {
        condGeography = vocabulary[condType].geography['defaultValue'];
    } else {

        if (condGeography.value == 'cities') {
            condGeography = condGeography.cities;
            var htmlCondGeo;

            for (var city in condGeography) {
                if (condGeography.hasOwnProperty(city)) {
                    htmlCondGeo = ''
                        + '<i class="condGeo" data-geoCode="' + city + '">'
                        + condGeography[city]
                        + '</i>';

                    condGeography[city] = htmlCondGeo;
                }
            }

            condGeography = Object.keys(condGeography).map(function (value) {
                return condGeography[value];
            }).join('');
        } else {

            if (condGeography.value === '') {
                condGeography = vocabulary[condType].geography['defaultValue'];
            } else {
                condGeography = vocabulary[condType].geography[condGeography.value];
            }
        }
    }


    if ($.isEmptyObject(condPriceMin)) {
        condPriceMin = vocabulary[condType].priceMin['defaultValue'];
    } else {
        if (condPriceMin === 'min') {
            condPriceMin = vocabulary[condType].priceMin[condPriceMin];
        } else {
            condPriceMin = Number(condPriceMin).format(0, 3, '&nbsp', '.') + '<i class="fa fa-rub"></i>';
        }
    }

    if ($.isEmptyObject(condPriceMax)) {
        condPriceMax = vocabulary[condType].priceMax['defaultValue'];
    } else {
        if (condPriceMax === 'min') {
            condPriceMax = vocabulary[condType].priceMax[condPriceMax];
        } else {
            condPriceMax = Number(condPriceMax).format(0, 3, '&nbsp;', '.') + '<i class="fa fa-rub"></i>';
        }
    }


    htmlTemplate = htmlTemplate
    +   '<table data-id="rsCondition" data-ruleId="'+ tpRuleId +'" >'
    +       '<thead class="header">'
    +           '<tr>'
    +               '<th class="col-sm-1">' + vocabulary[condType].grade.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].time.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].elapsed.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].geography.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].priceMin.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].priceMax.fieldName + '</th>'

    +               '<th class="col-sm-4 tprControl"></th>'
    +           '</tr>'
    +       '</thead>'
    +       '<tbody>'
    +           '<tr data-ruleId="' + tpRuleId + '" '
    +               'data-ruleName="' + tpRuleName + '" '
    +               'data-ruleActive="' + tpRuleActivity + '" '
    +               'data-ruleDeleted="' + tpRuleToDelete + '">'

    +               '<td>' + condGrade + '</td>'
    +               '<td>' + condDepartureTime + '</td>'
    +               '<td>' + condDuration + '</td>'
    +               '<td>' + condGeography + '</td>'
    +               '<td>' + condPriceMin + '</td>'
    +               '<td>' + condPriceMax + '</td>'

    +               '<td class="tpRuleActions">'
    +                   '<div class="slideButton">'
    +                     '<input type="hidden" name="tpgRule_' + tpRuleId + '_active" value="' + tpRuleActivity + '">'
    +                     '<input  type="checkbox" '
    +                             'id="tpRule_' + tpRuleId +'_active" '
    +                             'class="slide" '
    +                             'name="tpRule_' + tpRuleId + '_active" '
    +                            ( tpRuleActivity ? 'checked="checked"' : '' ) + ' '
    +                             'value="' + tpRuleActivity + '" '
    +                     '>'
    +                     '<label class="slide-label" for="tpRule_' + tpRuleId + '_active"></label>'
    +                   '</div>'

    +                   '<div class="dr-button" data-action="removeRule" ' + (!tpRuleToDelete ? '': 'disabled') + '>Удалить</div>'
    +                   '<div class="dr-button" data-action="restoreRule" ' + (tpRuleToDelete ? '': 'disabled') + '>Восстановить</div>'

    +                   '<div class="dr-button bgreen" data-action="saveChanges" disabled>Сохранить</div>'
    +                   '<div class="dr-button-grey" data-action="cancelChanges" disabled>Отменить</div>'
    +               '</td>'

    +           '</tr>'
    +       '</tbody>'
    +   '</table>';

    return htmlTemplate;
};

/*  Правила рендера таблицы условий ОТЕЛИ  */
renderTPRuleConditions.hotel    = function (ruleObject) {
    var htmlTemplate = '';


    var conditions        = ruleObject.conditions;
    var tpRule            = ruleObject.rule;

    var tpRuleId          = tpRule['tpRuleId'];
    var tpRuleName        = tpRule['tpRuleName'];
    var tpRuleActivity    = tpRule['tpRuleActivity'];
    var tpRuleToDelete    = tpRule['tpRuleToDelete'];

    var condType          = conditions['condType'];

    var condCategory      = conditions['category'] || {};
    var condGeography     = conditions['geography'] || {};
    var condStar          = conditions['star'] || {};
    
    var condPriceMin    = conditions['priceMin'] || {};
    var condPriceMax    = conditions['priceMax'] || {};

    // var condTransfer    = conditions['transfer'] || {};
    if ($.isEmptyObject(condCategory)) {
        condCategory = vocabulary[condType].grade['defaultValue'];
    } else {
        condCategory = vocabulary[condType].grade[condCategory];
    }

    if ($.isEmptyObject(condStar)) {
        condStar = vocabulary[condType].star['defaultValue'];
    } else {
        condStar = vocabulary[condType].star[condStar];
    }

    /* if condGeography is geography list
     * replace «cities» &&
     * turn isCities flag ON */
    if ($.isEmptyObject(condGeography)) {
        condGeography = vocabulary[condType].geography['defaultValue'];
    } else {

        if (condGeography.value == 'cities') {
            condGeography = condGeography.cities;
            var htmlCondGeo;

            for (var city in condGeography) {
                if (condGeography.hasOwnProperty(city)) {
                    htmlCondGeo = ''
                        + '<i class="condGeo" data-geoCode="' + city + '">'
                        + condGeography[city]
                        + '</i>';

                    condGeography[city] = htmlCondGeo;
                }
            }

            condGeography = Object.keys(condGeography).map(function (value) {
                return condGeography[value];
            }).join('');
        } else {

            if (condGeography.value === '') {
                condGeography = vocabulary[condType].geography['defaultValue'];
            } else {
                condGeography = vocabulary[condType].geography[condGeography.value];
            }
        }
    }

    if ($.isEmptyObject(condPriceMin)) {
        condPriceMin = vocabulary[condType].priceMin['defaultValue'];
    } else {
        if (condPriceMin === 'min') {
            condPriceMin = vocabulary[condType].priceMin[condPriceMin];
        } else {
            condPriceMin = Number(condPriceMin).format(0, 3, '&nbsp', '.') + '<i class="fa fa-rub"></i>';
        }
    }

    if ($.isEmptyObject(condPriceMax)) {
        condPriceMax = vocabulary[condType].priceMax['defaultValue'];
    } else {
        if (condPriceMax === 'min') {
            condPriceMax = vocabulary[condType].priceMax[condPriceMax];
        } else {
            condPriceMax = Number(condPriceMax).format(0, 3, '&nbsp;', '.') + '<i class="fa fa-rub"></i>';
        }
    }

    htmlTemplate = htmlTemplate
    +   '<table data-id="rsCondition" data-ruleId="'+ tpRuleId +'" >'
    +       '<thead class="header">'
    +           '<tr>'
    +               '<th class="col-sm-1">' + vocabulary[condType].grade.fieldName + '</th>'
    +               '<th class="col-sm-2">' + vocabulary[condType].geography.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].star.fieldName + '</th>'
    +               '<th class="col-sm-2">' + vocabulary[condType].priceMin.fieldName + '</th>'
    +               '<th class="col-sm-2">' + vocabulary[condType].priceMax.fieldName + '</th>'
    +               '<th class="col-sm-4 tprControl"></th>'
    +           '</tr>'
    +       '</thead>'
    +       '<tbody>'
    +           '<tr data-ruleId="' + tpRuleId + '" '
    +               'data-ruleName="' + tpRuleName + '" '
    +               'data-ruleActive="' + tpRuleActivity + '" '
    +               'data-ruleDeleted="' + tpRuleToDelete + '">'

    +               '<td>' + condCategory + '</td>'
    +               '<td>' + condGeography + '</td>'
    +               '<td>' + condStar + '</td>'
    +               '<td>' + condPriceMin + '</td>'
    +               '<td>' + condPriceMax + '</td>'

    +               '<td class="tpRuleActions">'
    +                   '<div class="slideButton">'
    +                     '<input type="hidden" name="tpgRule_' + tpRuleId + '_active" value="' + tpRuleActivity + '">'
    +                     '<input  type="checkbox" '
    +                             'id="tpRule_' + tpRuleId +'_active" '
    +                             'class="slide" '
    +                             'name="tpRule_' + tpRuleId + '_active" '
    +                            ( tpRuleActivity ? 'checked="checked"' : '' ) + ' '
    +                             'value="' + tpRuleActivity + '" '
    +                     '>'
    +                     '<label class="slide-label" for="tpRule_' + tpRuleId + '_active"></label>'
    +                   '</div>'

    +                   '<div class="dr-button" data-action="removeRule" ' + (!tpRuleToDelete ? '': 'disabled') + '>Удалить</div>'
    +                   '<div class="dr-button" data-action="restoreRule" ' + (tpRuleToDelete ? '': 'disabled') + '>Восстановить</div>'

    +                   '<div class="dr-button bgreen" data-action="saveChanges" disabled>Сохранить</div>'
    +                   '<div class="dr-button-grey" data-action="cancelChanges" disabled>Отменить</div>'
    +               '</td>'

    +           '</tr>'
    +       '</tbody>'
    +   '</table>';

    return htmlTemplate;
};

/*  Правила рендера таблицы условий ЖД  */
renderTPRuleConditions.transfer    = function (ruleObject) {
    var htmlTemplate = '';


    var conditions        = ruleObject.conditions;
    var tpRule            = ruleObject.rule;

    var tpRuleId          = tpRule['tpRuleId'];
    var tpRuleName        = tpRule['tpRuleName'];
    var tpRuleActivity    = tpRule['tpRuleActivity'];
    var tpRuleToDelete    = tpRule['tpRuleToDelete'];


    var condType          = conditions['condType'];


    var condGrade         = conditions['class'] || {};
    var condGeography     = conditions['geography'] || {};
    var condTransferType  = conditions['type'] || {};

    var condPriceMin    = conditions['priceMin'] || {};
    var condPriceMax    = conditions['priceMax'] || {};


    /* condGrade is 'class' field */
    if ($.isEmptyObject(condGrade)) {
        condGrade = vocabulary[condType].grade['defaultValue'];
    } else {
        condGrade = vocabulary[condType].grade[condGrade];
    }

    /* if condGeography is geography list
     * replace «cities» &&
     * turn isCities flag ON */
    if ($.isEmptyObject(condGeography)) {
        condGeography = vocabulary[condType].geography['defaultValue'];
    } else {

        if (condGeography.value == 'cities') {
            condGeography = condGeography.cities;
            var htmlCondGeo;

            for (var city in condGeography) {
                if (condGeography.hasOwnProperty(city)) {
                    htmlCondGeo = ''
                        + '<i class="condGeo" data-geoCode="' + city + '">'
                        + condGeography[city]
                        + '</i>';

                    condGeography[city] = htmlCondGeo;
                }
            }

            condGeography = Object.keys(condGeography).map(function (value) {
                return condGeography[value];
            }).join('');
        } else {

            if (condGeography.value === '') {
                condGeography = vocabulary[condType].geography['defaultValue'];
            } else {
                condGeography = vocabulary[condType].geography[condGeography.value];
            }
        }
    }

    if ($.isEmptyObject(condTransferType)) {
        condTransferType = vocabulary[condType].type['defaultValue'];
    } else {
        condTransferType = vocabulary[condType].type[condTransferType];
    }

    if ($.isEmptyObject(condPriceMin)) {
        condPriceMin = vocabulary[condType].priceMin['defaultValue'];
    } else {
        if (condPriceMin === 'min') {
            condPriceMin = vocabulary[condType].priceMin[condPriceMin];
        } else {
            condPriceMin = Number(condPriceMin).format(0, 3, '&nbsp', '.') + '<i class="fa fa-rub"></i>';
        }
    }

    if ($.isEmptyObject(condPriceMax)) {
        condPriceMax = vocabulary[condType].priceMax['defaultValue'];
    } else {
        if (condPriceMax === 'min') {
            condPriceMax = vocabulary[condType].priceMax[condPriceMax];
        } else {
            condPriceMax = Number(condPriceMax).format(0, 3, '&nbsp;', '.') + '<i class="fa fa-rub"></i>';
        }
    }



    htmlTemplate = htmlTemplate
    +   '<table data-id="rsCondition" data-ruleId="'+ tpRuleId +'" >'
    +       '<thead class="header">'
    +           '<tr>'
    +               '<th class="col-sm-2">' + vocabulary[condType].grade.fieldName + '</th>'
    +               '<th class="col-sm-2">' + vocabulary[condType].geography.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].type.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].priceMin.fieldName + '</th>'
    +               '<th class="col-sm-1">' + vocabulary[condType].priceMax.fieldName + '</th>'
    +               '<th class="col-sm-4 tprControl"></th>'
    +           '</tr>'
    +       '</thead>'
    +       '<tbody>'
    +           '<tr data-ruleId="' + tpRuleId + '" data-ruleName="' + tpRuleName + '" data-ruleActive="' + tpRuleActivity + '" data-ruleDeleted="' + tpRuleToDelete + '">'
    +               '<td>' + condGrade + '</td>'
    +               '<td>' + condGeography + '</td>'
    +               '<td>' + condTransferType + '</td>'

    +               '<td>' + condPriceMin + '</td>'
    +               '<td>' + condPriceMax + '</td>'

    +               '<td class="tpRuleActions">'
    +                   '<div class="slideButton">'
    +                     '<input type="hidden" name="tpgRule_' + tpRuleId + '_active" value="' + tpRuleActivity + '">'
    +                     '<input  type="checkbox" '
    +                             'id="tpRule_' + tpRuleId +'_active" '
    +                             'class="slide" '
    +                             'name="tpRule_' + tpRuleId + '_active" '
    +                            ( tpRuleActivity ? 'checked="checked"' : '' ) + ' '
    +                             'value="' + tpRuleActivity + '" '
    +                     '>'
    +                     '<label class="slide-label" for="tpRule_' + tpRuleId + '_active"></label>'
    +                   '</div>'

    +                   '<div class="dr-button" data-action="removeRule" ' + (!tpRuleToDelete ? '': 'disabled') + '>Удалить</div>'
    +                   '<div class="dr-button" data-action="restoreRule" ' + (tpRuleToDelete ? '': 'disabled') + '>Восстановить</div>'

    +                   '<div class="dr-button bgreen" data-action="saveChanges" disabled>Сохранить</div>'
    +                   '<div class="dr-button-grey" data-action="cancelChanges" disabled>Отменить</div>'
    +               '</td>'

    +           '</tr>'
    +       '</tbody>'
    + '</table>';

    return htmlTemplate;
};




/*    Коллекция поп-ап фильтров >>>
 *    И тем оформления редактирования значения условий
 *    в таблице правил
 */
var fieldEditorPopup = {};

//    Коллекция поп-ап фильтров → Общие фильтры >>>
fieldEditorPopup.common = {
    priceMin: function (setted) {
        var $popAlert = $('#main-content').find('.pop-alert');

        $popAlert.on('change',
            '.tpRuleField.priceMinField input[name="priceMin"]',
            function () {
                var isManual = $(this).val() == 'custom';
                var manualInput = $('.tpRuleField.priceMinField input[name="rubles"]');

                if( isManual ) {
                    $( manualInput ).show();
                } else {
                    $( manualInput ).hide();
                }
            });

        var templateObjs = $.extend({}, vocabulary.avia.priceMin);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            + '<form class="tpRuleField priceMinField">';

        var settedValue;

        if( setted && setted.hasOwnProperty('data') ) {
            settedValue = setted.data;
        } else {
            settedValue = templateObjs.defaultValue;
        }


        var setValue = $.parseHTML(settedValue);

        setValue = $(setValue).text().replace(/\u00A0/g,'');

        var objKey;
        var objVal;
        var isChecked = false;
        var isNumber = true;

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            isChecked = (setValue == objVal);

            if( isChecked ) {
                isNumber = false;
            }

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" name="priceMin" '
                +           'value="' + objKey + '" '
                +           (isChecked ? 'checked':'') + '>'

                +       objVal

                + '</label>';

            isChecked = false;
        }

        if( isNumber ) {
            isChecked = true;
        } else {
            setValue = 0;
        }

        templateHTML = templateHTML
            +   '<label><input type="radio" name="priceMin" value="custom" '
            +       ( isChecked ? 'checked' : '') + '>'

            +       'Ручной ввод '

            +       '<input type="number" name="rubles" value="' + setValue
            +           '" style="display: ' + ( isNumber ? 'block' : 'none' ) + '">'

            +   '</label>'

            +   '<input type="reset" value="Отменить">'
            +   '<input type="submit" value="Применить">'
            + '</form>';

        return templateHTML;
    },
    priceMax: function (setted) {
        var $popAlert = $('#main-content').find('.pop-alert');

        $popAlert.on('change',
            '.tpRuleField.priceMaxField input[name="priceMax"]',
            function () {
                var isManual = $(this).val() == 'custom';
                var manualInput = $('.tpRuleField.priceMaxField input[name="rubles"]');

                if( isManual ) {
                    $( manualInput ).show();
                } else {
                    $( manualInput ).hide();
                }
            });

        var templateObjs = $.extend({}, vocabulary.avia.priceMax);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            + '<form class="tpRuleField priceMaxField">';

        var settedValue;

        if( setted && setted.hasOwnProperty('data') ) {
            settedValue = setted.data;
        } else {
            settedValue = templateObjs.defaultValue;
        }

        var setValue = $.parseHTML(settedValue);
        setValue = $(setValue).text().replace(/\u00A0/g,'');

        var objKey;
        var objVal;
        var isChecked = false;
        var isNumber = true;

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            isChecked = setValue == objVal;

            if( isChecked ) {
                isNumber = false;
            }

            templateHTML = templateHTML
                +        '<label><input type="radio" name="priceMax" value="' + objKey + '" '
                +         ( isChecked ? 'checked' : '' ) + '>' + objVal + '</label>';

            isChecked = false;
        }

        if( isNumber ) {
            isChecked = true;
        } else {
            setValue = 0;
        }

        templateHTML = templateHTML
            +   '<label><input type="radio" name="priceMax" value="custom" '
            +         ( isChecked ? 'checked' : '') + '>'
            +       'Ручной ввод '
            +       '<input type="number" name="rubles" value="' + setValue
            +               '" style="display: ' + ( isNumber ? 'block' : 'none' ) + '">'
            +   '</label>'

            +   '<input type="reset" value="Отменить">'
            +   '<input type="submit" value="Применить">'
            + '</form>';

        return templateHTML;
    },
    timeRanges: function (selected) {

        var templateHTML = '';
        templateHTML = templateHTML
            + '<form class="tpRuleField timeField">'
            +     '<div id="time-range">';

        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = 0;
            selected       = {};
            selected.data  = 0;
        }

        var setValue     = $.parseHTML(selectedValues);
        var tprTimerDOM  = $('<div>').append(setValue).find('.tprTimer');

        var timerHTMLtoObj = function (timerStart, timerEnd) {
            timerStart     = $(timerStart).text().split(':');
            timerEnd       = $(timerEnd).text().split(':');

            return {
                start     : Number(timerStart[0])*60 + Number(timerStart[1]),
                end        : Number(timerEnd[0])*60 + Number(timerEnd[1]),

                htmlStart    : timerStart[0] + ':' + timerStart[1],
                htmlEnd        : timerEnd[0] + ':' + timerEnd[1]
            }
        };

        var timerObj;
        var timerSpan = [];

        var timeStartDOM;
        var timeEndDOM;

        for(var i = 0; i < tprTimerDOM.length; i++) {
            timerSpan[i]    = $(tprTimerDOM[i]);

            timeStartDOM    = timerSpan[i].find('.timeStart');
            timeEndDOM        = timerSpan[i].find('.timeEnd');

            timerObj = timerHTMLtoObj(timeStartDOM, timeEndDOM);

            templateHTML = templateHTML
                + '<div class="tprTimer'+i+'">'
                +   '<p>'
                +       '<i class="removeInterval fa fa-times"></i>'

                +       'Временной интервал: '
                +       '<span class="slider-time">' + timerObj.htmlStart + '</span> — '
                +       '<span class="slider-time2">' + timerObj.htmlEnd + '</span>'
                +   '</p>'
                +   '<div class="sliderBody"></div>'
                + '</div>';
        }

        if( tprTimerDOM.length == 0 || tprTimerDOM == '' || tprTimerDOM[0] == '' ) {
            templateHTML = templateHTML
                + '<div class="tprTimer">'
                +    '<p>'
                +       '<i class="removeInterval fa fa-times"></i>'

                +       'Временной интервал: '
                +       '<span class="slider-time">00:00</span> — '
                +       '<span class="slider-time2">23:59</span>'
                +    '</p>'
                +    '<div class="sliderBody"></div>'
                + '</div>';

        }

        templateHTML = templateHTML
            +   '</div>'
            +   '<input type="button" value="Добавить интервал" class="addInterval">'

            +   '<input type="reset" value="Отменить">'
            +   '<input type="submit" value="Применить">'
            + '</form>';
        return templateHTML;
    }
};
//    <<< Общие фильтры

//    Коллекция поп-ап фильтров → Авиация
fieldEditorPopup.avia = {
    grade: function (selected) {
        var templateObjs = $.extend({}, vocabulary.avia.grade);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;

        var templateHTML = '<form class="tpRuleField gradeField">';

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" '
                +              'name="grade" '
                +              'value="' + objKey + '" '
                +               ( selectedValues.indexOf(objVal) + 1 > 0 ? 'checked' : '' )
                +   '>'
                +           objVal
                +   '</label>'
        }

        templateHTML = templateHTML
            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            + '</form>';

        return templateHTML;
    },
    time: fieldEditorPopup.common.timeRanges,
    elapsed: function (selected) {
        var $popAlert = $('#main-content').find('.pop-alert');

        $popAlert.on('change', '.tpRuleField.elapsedField input[name="elapsed"]', function () {
            var isManual = $(this).val() == 'custom';
            var manualInput = $('.tpRuleField.elapsedField input[name="minutes"]');

            if( isManual ) {
                $( manualInput ).show();
            } else {
                $( manualInput ).hide();
            }
        });

        var templateObjs = $.extend({}, vocabulary.avia.elapsed);
        var templateFieldUnit = templateObjs.fieldUnit;

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            +    '<form class="tpRuleField elapsedField">';



        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;
        var isChecked = false;
        var isNumber = false;

        if ( selectedValues.indexOf('&nbsp;ч.') > -1 ) {
            isNumber = true;

            selectedValues = selectedValues.split('ч.');
            selectedValues[0] = selectedValues[0].replace(/\D/g,'');
            selectedValues[1] = selectedValues[1].replace(/\D/g,'');

            selectedValues = selectedValues[0]*60 + selectedValues[1]*1;
        }

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];
            isChecked = ( selectedValues == objKey );
            isChecked = isChecked || ( selectedValues == objVal );

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" name="elapsed" value="' + objKey + '" '
                +               (isChecked ? 'checked' : '') + '>'
                +           objVal
                +   '</label>';

            if( isChecked ) {
                isNumber = false;
            }
        }

        selectedValues = ( $.isNumeric(selectedValues) ? selectedValues : 0 );

        templateHTML = templateHTML
            +   '<label>'
            +       '<input type="radio" name="elapsed" value="custom" '
            +                ( isNumber ? 'checked' : '' ) + '>'
            +           'Ручной ввод (' + templateFieldUnit + ') '

            +           '<input type="number" name="minutes" value="' + selectedValues + '" '
            +               'style="display:' + ( isNumber ? 'block' : 'none' ) + '">'
            +   '</label>'

            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            +    '</form>';

        return templateHTML;
    },
    geography: function (selected) {
        var templateObjs = $.extend({}, vocabulary.avia.geography);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            +    '<form class="tpRuleField geographyField">';

        var selectedValues;
        if( selected && selected.hasOwnProperty('data') ){
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        selectedValues = $.parseHTML(selectedValues);

        var isGeoList = false;

        if( $(selectedValues).length ) {
            if( $(selectedValues[0]).data('geocode') ) {
                isGeoList = 'cities';

                selectedValues = $(selectedValues);
                selectedValues = selectedValues.map(function () {
                    return this.innerText;
                }).get().join('; ');
            } else {
                selectedValues = selectedValues[0].data;
            }
        } else {
            selectedValues = 'defaultValue';
        }

        var objKey;
        var objVal;
        var isChecked = false;

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            isChecked = isChecked || (objKey == isGeoList);
            isChecked = isChecked || (selectedValues == objVal);
            isChecked = isChecked || (selectedValues == '' && objKey == 'defaultValue');

            templateHTML = templateHTML
                + '<label><input type="radio" name="geography" value="' + objKey + '" '
                + ( isChecked ? 'checked' : '' ) + '>' + objVal + '</label>';

            isChecked = false;
        }

        if( !isGeoList ){
            selectedValues = ''
        }

        templateHTML = templateHTML
            +         '<input class="tprGeography" type="text" value="' + selectedValues + '">'

            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'

            + '</form>';

        return templateHTML;
    },
    company: function (selected) {
        var templateObjs = $.extend({}, vocabulary.avia.company);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            +    '<form class="tpRuleField companyField">';


        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }


        selectedValues = $.parseHTML(selectedValues);

        var isCompanyList = false;

        if( $(selectedValues).length ) {
            if( $(selectedValues[0]).data('companycode') ) {
                isCompanyList = 'companies';

                selectedValues = $(selectedValues);
                selectedValues = selectedValues.map(function () {
                    return this.innerText;
                }).get().join('; ');
            } else {
                selectedValues = selectedValues[0].data;
            }
        } else {
            selectedValues = '';
        }


        var objKey;
        var objVal;
        var isChecked = false;

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            isChecked = isChecked || (objKey == isCompanyList);
            isChecked = isChecked || (selectedValues == objVal);
            isChecked = isChecked || (selectedValues == '' && objKey == 'defaultValue');

            templateHTML = templateHTML
                + '<label><input type="radio" name="company" value="' + objKey + '" '
                + ( isChecked ? 'checked' : '' ) + '>' + objVal + '</label>';

            isChecked = false;
        }

        if( !isCompanyList ) {
            selectedValues = '';
        }

        templateHTML = templateHTML
            +         '<input class="tprCompany" type="text" value="' + selectedValues + '">'

            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'

            +    '</form>';

        return templateHTML;
    },
    transfer: function (setted) {
        var templateObjs = $.extend({}, vocabulary.avia.transfer);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            +    '<form class="tpRuleField transferField">';

        var settedValues;

        if( setted && setted.hasOwnProperty('data') ) {
            settedValues = setted.data;
        } else {
            settedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;
        var isChecked = false;

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            isChecked = ( settedValues == objVal );

            templateHTML = templateHTML
                +         '<label><input type="radio" name="transfer" value="' + objKey + '" '
                + ( isChecked ? 'checked' : '' ) + '>' + objVal + '</label>';
        }
        templateHTML = templateHTML
            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            +    '</form>';

        return templateHTML;
    },
    priceMin: fieldEditorPopup.common.priceMin,
    priceMax: fieldEditorPopup.common.priceMax
};

//    Коллекция поп-ап фильтров → ЖД
fieldEditorPopup.train = {
    grade: function (selected) {
        var templateObjs = $.extend({}, vocabulary.train.grade);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;

        var templateHTML = '<form class="tpRuleField gradeField">';

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" '
                +              'name="grade" '
                +              'value="' + objKey + '" '
                +               ( selectedValues.indexOf(objVal) + 1 > 0 ? 'checked' : '' )
                +   '>'
                +           objVal
                +   '</label>'
        }

        templateHTML = templateHTML
            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            + '</form>';

        return templateHTML;
    },
    time: fieldEditorPopup.common.timeRanges,
    geography: function (selected) {
        var templateObjs = $.extend({}, vocabulary.train.geography);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            +    '<form class="tpRuleField geographyField">';

        var selectedValues;
        if( selected && selected.hasOwnProperty('data') ){
            selectedValues = $.parseHTML(selected.data);
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var isGeoList = false;

        if( $(selectedValues).length ) {
            if( $(selectedValues[0]).data('geocode') ) {
                isGeoList = 'cities';
            }
        }

        selectedValues = $(selectedValues);
        selectedValues = selectedValues.map(function () {
            return this.innerText;
        }).get().join('; ');


        var objKey;
        var objVal;
        var isChecked = false;

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            isChecked = ( $(selectedValues[0]).data('geocode') == objKey );
            isChecked = isChecked || (objKey == isGeoList);
            isChecked = isChecked || (selectedValues == '' && objKey == 'defaultValue');

            templateHTML = templateHTML
                + '<label><input type="radio" name="geography" value="' + objKey + '" '
                + ( isChecked ? 'checked' : '' ) + '>' + objVal + '</label>';
        }

        templateHTML = templateHTML
            +         '<input class="tprGeography" type="text" value="' + selectedValues + '">'

            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'

            + '</form>';

        return templateHTML;
    },
    elapsed: function (selected) {
        var $popAlert = $('#main-content').find('.pop-alert');

        $popAlert.on('change', '.tpRuleField.elapsedField input[name="elapsed"]', function () {
            var isManual = $(this).val() == 'custom';
            var manualInput = $('.tpRuleField.elapsedField input[name="minutes"]');

            if( isManual ) {
                $( manualInput ).show();
            } else {
                $( manualInput ).hide();
            }
        });

        var templateObjs = $.extend({}, vocabulary.avia.elapsed);
        var templateFieldUnit = templateObjs.fieldUnit;

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            +    '<form class="tpRuleField elapsedField">';



        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;
        var isChecked = false;
        var isNumber = false;

        if ( selectedValues.indexOf('&nbsp;ч.') > -1 ) {
            isNumber = true;

            selectedValues = selectedValues.split('ч.');
            selectedValues[0] = selectedValues[0].replace(/\D/g,'');
            selectedValues[1] = selectedValues[1].replace(/\D/g,'');

            selectedValues = selectedValues[0]*60 + selectedValues[1]*1;
        }

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];
            isChecked = ( selectedValues == objKey );
            isChecked = isChecked || ( selectedValues == objVal );

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" name="elapsed" value="' + objKey + '" '
                +               (isChecked ? 'checked' : '') + '>'
                +           objVal
                +   '</label>';

            if( isChecked ) {
                isNumber = false;
            }
        }

        selectedValues = ( $.isNumeric(selectedValues) ? selectedValues : 0 );

        templateHTML = templateHTML
            +   '<label>'
            +       '<input type="radio" name="elapsed" value="custom" '
            +                ( isNumber ? 'checked' : '' ) + '>'
            +           'Ручной ввод (' + templateFieldUnit + ') '

            +           '<input type="number" name="minutes" value="' + selectedValues + '" '
            +               'style="display:' + ( isNumber ? 'block' : 'none' ) + '">'
            +   '</label>'

            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            +    '</form>';

        return templateHTML;
    },
    priceMin: fieldEditorPopup.common.priceMin,
    priceMax: fieldEditorPopup.common.priceMax,
};

//    Коллекция поп-ап фильтров → Отели
fieldEditorPopup.hotel = {
    grade: function (selected) {
        var templateObjs = $.extend({}, vocabulary.hotel.grade);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;

        var templateHTML = '<form class="tpRuleField gradeField">';

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" '
                +              'name="grade" '
                +              'value="' + objKey + '" '
                +               ( selectedValues.indexOf(objVal) + 1 > 0 ? 'checked' : '' )
                +   '>'
                +           objVal
                +   '</label>'
        }

        templateHTML = templateHTML
            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            + '</form>';

        return templateHTML;
    },
    star: function (selected) {
        var templateObjs = $.extend({}, vocabulary.hotel.star);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;

        var templateHTML = '<form class="tpRuleField starField">';

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" '
                +              'name="star" '
                +              'value="' + objKey + '" '
                +               ( selectedValues.indexOf(objVal) + 1 > 0 ? 'checked' : '' )
                +   '>'
                +           objVal
                +   '</label>'
        }

        templateHTML = templateHTML
            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            + '</form>';

        return templateHTML;
    },
    geography: function (selected) {
        var templateObjs = $.extend({}, vocabulary.hotel.geography);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            +    '<form class="tpRuleField geographyField">';

        var selectedValues;
        if( selected && selected.hasOwnProperty('data') ){
            selectedValues = $.parseHTML(selected.data);
        } else {
            selectedValues = templateObjs.defaultValue;
        }


        var isGeoList = false;

        if( $(selectedValues).length ) {
            if( $(selectedValues[0]).data('geocode') ) {
                isGeoList = 'cities';

                selectedValues = $(selectedValues);
                selectedValues = selectedValues.map(function () {
                    return this.innerText;
                }).get().join('; ');
            } else {
                selectedValues = selectedValues[0].data;
            }
        } else {
            selectedValues = 'defaultValue';
        }

        var objKey;
        var objVal;
        var isChecked = false;

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            isChecked = isChecked || (objKey == isGeoList);
            isChecked = isChecked || (selectedValues == objVal);
            isChecked = isChecked || (selectedValues == '' && objKey == 'defaultValue');

            templateHTML = templateHTML
                + '<label><input type="radio" name="geography" value="' + objKey + '" '
                + ( isChecked ? 'checked' : '' ) + '>' + objVal + '</label>';

            isChecked = false;
        }

        if( !isGeoList ){
            selectedValues = ''
        }

        templateHTML = templateHTML
            +         '<input class="tprGeography" type="text" value="' + selectedValues + '">'

            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'

            + '</form>';

        return templateHTML;
    },
    priceMin: fieldEditorPopup.common.priceMin,
    priceMax: fieldEditorPopup.common.priceMax,
};

//    Коллекция поп-ап фильтров → Трансферы
fieldEditorPopup.transfer = {
    grade: function (selected) {
        var templateObjs = $.extend({}, vocabulary.transfer.grade);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;

        var templateHTML = '<form class="tpRuleField gradeField">';

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" '
                +              'name="grade" '
                +              'value="' + objKey + '" '
                +               ( selectedValues.indexOf(objVal) + 1 > 0 ? 'checked' : '' )
                +   '>'
                +           objVal
                +   '</label>'
        }

        templateHTML = templateHTML
            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            + '</form>';

        return templateHTML;
    },
    geography: function (selected) {
        var templateObjs = $.extend({}, vocabulary.transfer.geography);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var templateHTML = '';
        templateHTML = templateHTML
            +    '<form class="tpRuleField geographyField">';

        var selectedValues;
        if( selected && selected.hasOwnProperty('data') ){
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        selectedValues = $.parseHTML(selectedValues);

        var isGeoList = false;

        if( $(selectedValues).length ) {
            if( $(selectedValues[0]).data('geocode') ) {
                isGeoList = 'cities';

                selectedValues = $(selectedValues);
                selectedValues = selectedValues.map(function () {
                    return this.innerText;
                }).get().join('; ');
            } else {
                selectedValues = selectedValues[0].data;
            }
        } else {
            selectedValues = 'defaultValue';
        }

        var objKey;
        var objVal;
        var isChecked = false;

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            isChecked = isChecked || (objKey == isGeoList);
            isChecked = isChecked || (selectedValues == objVal);
            isChecked = isChecked || (selectedValues == '' && objKey == 'defaultValue');

            templateHTML = templateHTML
                + '<label><input type="radio" name="geography" value="' + objKey + '" '
                + ( isChecked ? 'checked' : '' ) + '>' + objVal + '</label>';

            isChecked = false;
        }

        if( !isGeoList ){
            selectedValues = ''
        }

        templateHTML = templateHTML
            +         '<input class="tprGeography" type="text" value="' + selectedValues + '">'

            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'

            + '</form>';

        return templateHTML;
    },
    type: function (selected) {
        var templateObjs = $.extend({}, vocabulary.transfer.type);

        delete templateObjs.fieldName;
        delete templateObjs.fieldUnit;
        delete templateObjs.fieldInitName;
        delete templateObjs.fieldParseToSave;

        var selectedValues;

        if( selected && selected.hasOwnProperty('data') ) {
            selectedValues = selected.data;
        } else {
            selectedValues = templateObjs.defaultValue;
        }

        var objKey;
        var objVal;

        var templateHTML = '<form class="tpRuleField typeField">';

        for(var i = 0; i < Object.keys(templateObjs).length; i++) {
            objKey = Object.keys(templateObjs)[i];
            objVal = templateObjs[objKey];

            templateHTML = templateHTML
                +   '<label>'
                +       '<input type="radio" '
                +              'name="type" '
                +              'value="' + objKey + '" '
                +               ( selectedValues.indexOf(objVal) + 1 > 0 ? 'checked' : '' )
                +   '>'
                +           objVal
                +   '</label>'
        }

        templateHTML = templateHTML
            +         '<input type="reset" value="Отменить">'
            +         '<input type="submit" value="Применить">'
            + '</form>';

        return templateHTML;
    },
    time: fieldEditorPopup.common.timeRanges,
    priceMin: fieldEditorPopup.common.priceMin,
    priceMax: fieldEditorPopup.common.priceMax
};




/*    Словарь выражений и имен значений полей >>>
 *    - отображаемых в таблице при рендере        -    renderTPRuleConditions[condType]()
 *    - кодируемых для бэкенда значений в ключи    -    setTravelPolicyRule
 */
var vocabulary = {
    avia: {
        fieldName: 'Авиа',
        grade: {
            fieldName: 'Класс',
            fieldUnit: '-класс',
            fieldInitName: 'class',
            y: 'Эконом',
            s: 'Комфорт',
            c: 'Бизнес',
            defaultValue: 'Любой',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                return $formToParse.find(':checked').val();
            }
        },
        elapsed: {
            fieldName: 'Время в пути',
            fieldUnit: 'минут',
            defaultValue: 'Любое',
            '1200': 'до 20 часов',
            '240': 'до 4 часов',
            '120': 'до 2 часов',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        },
        time: {
            fieldName: 'Время вылета',
            fieldUnit: '',
            defaultValue: 'Любое',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var timeRange = [];

                $formToParse.find('#time-range [class^=tprTimer]').each(function (index, val) {
                    var timeStart    = $(val).find('.slider-time').text().replace(':','');
                    var timeEnd        = $(val).find('.slider-time2').text().replace(':','');

                    timeRange[index] = timeStart + timeEnd;
                });

                timeRange = timeRange.join(';');

                return timeRange;
            }
        },
        geography: {
            fieldName: 'География полета',
            fieldUnit: '',
            defaultValue: 'Любая',

            rusin:    'только по России',
            uisin:    'только по СНГ',
            fromrus:'из России',
            torus:    'в Россию',
            fromuis:'из СНГ',
            touis:    'в СНГ',
            rusout:    'вне России',
            uisout:    'вне СНГ',
            cities: 'перечисление возможных городов',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'cities' ) {
                    //console.log('Is Cities List...');
                    var citiesList = {};

                    $.map( $formToParse.find('.tagit-choice'), function (city) {
                        var $city = $(city);
                        var geoCode    = $city.data('geocode');

                        citiesList[ geoCode ] = $city.find('.tagit-label').text();
                    });

                    //console.log('...', citiesList);
                    if( Object.size(citiesList) === undefined ){
                        //console.log('Empty Cities Value returned ""...');

                        return {
                            value: ""
                        }
                    } else {
                        //console.log('nonEmpty Cities Value return object: ', citiesList);
                        return {
                            value: "cities",
                            cities: citiesList
                        };
                    }
                }
                //console.log('Else it`s linear value: ', checkedValue);

                return {
                    value: checkedValue
                }
            }
        },
        company: {
            fieldName:      'Авиакомпании',
            fieldUnit:      '',
            defaultValue:   'Любые',
            any:            'Все',
            rus:            'Российские компании',
            uis:            'Авиакомпании СНГ',
            other:          'Иностранные компании',
            companies:      'Перечисление авиакомпаний',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'companies' ) {
                    //console.log('Is Companies List...');
                    var companiesList = {};
                    var aviaCompanyDict = pageCityDict.avia.companies;

                    $.map( $formToParse.find('.tagit-choice'), function (company) {
                        var $company      = $(company);
                        var companyCode   = $company.data('companycode');
                        var companyName   = $company.find('.tagit-label').text();

                        if( companyCode !== undefined || companyCode !== '' ){

                            $.each(aviaCompanyDict, function(key,val){

                                if( companyName == val ){
                                    companyCode = key;
                                }
                            });
                        }

                        companiesList[ companyCode ] = companyName;
                    });
                    //console.log('...', companiesList);
                    if( Object.size(companiesList) === undefined ){
                        //console.log('Empty Companies Value returned ""...');
                        return {
                            value: ""
                        }
                    } else {
                        //console.log('nonEmpty Companies Value return object: ', companiesList);
                        return {
                            value: "companies",
                            companies: companiesList
                        }
                    }
                }
                //console.log('Else it`s linear value: ', checkedValue);

                return {
                    value: checkedValue
                }
            }
        },
        transfer: {
            fieldName:    'Кол-во пересадок',
            fieldUnit:    '',
            defaultValue: 'Любое',
            0: 'Без пресадок',
            1: 'Одна пересадка',
            2: 'До 2 пересадок',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                return $formToParse.find(':checked').val();
            }
        },
        priceMin: {
            fieldName:    'Мин. стоимость',
            fieldUnit:    '',
            defaultValue: 'Любая',
            min: 'Только минимальная',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        },
        priceMax: {
            fieldName:    'Макс. стоимость',
            fieldUnit:    '',
            defaultValue: 'Любая',
            min: 'Только минимальная',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        }
    },
    train: {
        fieldName: 'Ж/Д',
        grade: {
            fieldName:      ' Класс',
            fieldUnit:      '-класс',
            fieldInitName:  'class',
            defaultValue:   'Любой',

            coupe:          'Купе',
            reserved:       'Плацкарт',
            seat:           'Сидячий',
            lux:            'Люкс',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                return checkedValue;
            }
        },
        time: {
            fieldName:    'Время отправления',
            fieldUnit:    '',
            fieldInitName: 'departureTime',
            defaultValue: 'Любое',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var timeRange = [];

                $formToParse.find('#time-range [class^=tprTimer]').each(function (index, val) {
                    var timeStart    = $(val).find('.slider-time').text().replace(':','');
                    var timeEnd        = $(val).find('.slider-time2').text().replace(':','');

                    timeRange[index] = timeStart + timeEnd;
                });

                timeRange = timeRange.join(';');

                return timeRange;
            }
        },
        elapsed: {
            fieldName: 'Время в пути',
            fieldUnit: 'минут',
            fieldInitName: 'duration',

            defaultValue: 'Любое',
            '1200': 'до 20 часов',
            '240': 'до 4 часов',
            '120': 'до 2 часов',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        },
        geography: {
            fieldName:    'География поездки',
            fieldUnit:    '',
            defaultValue: 'Любая',

            rusin:        'только по России',
            uisin:        'только по СНГ',
            fromrus:    'из России',
            torus:        'в Россию',
            fromuis:    'из СНГ',
            touis:        'в СНГ',
            rusout:        'вне России',
            uisout:        'вне СНГ',
            cities:        'перечисление возможных городов',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'cities' ) {
                    //console.log('Is Cities List...');
                    var citiesList = {};

                    $.map( $formToParse.find('.tagit-choice'), function (city) {
                        var $city = $(city);
                        var geoCode    = $city.data('geocode');

                        citiesList[ geoCode ] = $city.find('.tagit-label').text();
                    });

                    //console.log('...', citiesList);
                    if( Object.size(citiesList) === undefined ){
                        //console.log('Empty Cities Value returned ""...');

                        return {
                            value: ""
                        }
                    } else {
                        //console.log('nonEmpty Cities Value return object: ', citiesList);
                        return {
                            value: "cities",
                            cities: citiesList
                        };
                    }
                }
                //console.log('Else it`s linear value: ', checkedValue);

                return {
                    value: checkedValue
                }
            }
        },
        priceMin: {
            fieldName:    'Мин. стоимость',
            fieldUnit:    '',
            defaultValue: 'Любая',
            min: 'Только минимальная',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        },
        priceMax: {
            fieldName:    'Макс. стоимость',
            fieldUnit:    '',
            defaultValue: 'Любая',
            min: 'Только минимальная',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        }
    },
    hotel: {
        fieldName: 'Гостиницы',
        grade: {
            fieldName:    'Категория',
            fieldUnit:    '',
            fieldInitName: 'category',

            defaultValue:   'Любая',

            apartement:     'Апартаменты',
            hotel:          'Отели',
            minihotel:      'Мини-отели‎',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
console.log($formToParse);
                return $formToParse.find(':checked').val();
            }
        },
        star: {
            fieldName:    'Звездность',
            fieldUnit:    '',

            defaultValue:   'Любая',
            '0':            'без звезд',
            '1':            '1 звезда',
            '2':            '2 звезды',
            '3':            '3 звезды',
            '4':            '4 звезды',
            '5':            '5 звезд',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                return $formToParse.find(':checked').val();
            }
        },
        geography: {
            fieldName:    'География проживания',
            fieldUnit:    '',

            defaultValue: 'Любая',

            rus:    'по России',
            uis:    'по СНГ',
            other:  'зарубжное',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                return {
                    value: checkedValue
                }
            }
        },
        priceMin: {
            fieldName:    'Мин. стоимость',
            fieldUnit:    '',
            defaultValue: 'Любая',
            min: 'Только минимальная',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        },
        priceMax: {
            fieldName:    'Макс. стоимость',
            fieldUnit:    '',
            defaultValue: 'Любая',
            min: 'Только минимальная',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        }
    },
    transfer: {
        fieldName: 'Трансферы',
        grade: {
            fieldName: 'Тип автомобиля',
            fieldUnit: '',
            fieldInitName: 'class',

            defaultValue: 'Любой',

            '0':    'Стандарт',
            '1':    'Бизнес',
            '2':    'Представительский',
            '3':    'Минивэн',
            '4':    'Микроавтобус',
            '5':    'Автобус',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                return checkedValue;
            }
        },
        geography: {
            fieldName: 'География трансфера',
            fieldUnit: '',

            defaultValue: 'Любые направления',

            rus:    'Россия',
            uis:    'Россия и СНГ',
            other:  'Другие страны',

            fieldParseToSave: function (formToParse) {
                var $formToParse = $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                return {
                    value: checkedValue
                }
            }
        },
        type: {
            fieldName: 'Тип',
            fieldUnit: '-категория',

            defaultValue: 'Любой',
            '0': 'Трансфер',
            '1': 'Аренда',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                return checkedValue;
            }
        },
        priceMin: {
            fieldName:    'Мин. стоимость',
            fieldUnit:    '',
            defaultValue: 'Любая',
            min: 'Только минимальная',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        },
        priceMax: {
            fieldName:    'Макс. стоимость',
            fieldUnit:    '',
            defaultValue: 'Любая',
            min: 'Только минимальная',

            fieldParseToSave: function (formToParse) {
                var $formToParse= $(formToParse);
                var checkedValue = $formToParse.find(':checked').val();

                if( checkedValue == 'custom' ) {
                    checkedValue = $formToParse.find('[type="number"]').val();
                }

                return checkedValue;
            }
        }
    }
};
//    <<< Словарь выражений и имен значений полей




/*    Индексы полей, их имен и указателей фильтров fieldEditorPopup >>>
 *  что бы не хранить эти имена в каждой таблице и ячейке правила
 */
var ruleLineDictionary = {
    avia: {
        0: 'grade',
        1: 'time',
        2: 'elapsed',
        3: 'priceMin',
        4: 'priceMax',
        5: 'geography',
        6: 'company',
        7: 'transfer'
    },
    train: {
        0: 'grade',
        1: 'time',
        2: 'elapsed',
        3: 'geography',
        4: 'priceMin',
        5: 'priceMax'
    },
    hotel: {
        0: 'grade', //category
        1: 'geography',
        2: 'star',
        3: 'priceMin',
        4: 'priceMax'
    },
    transfer: {
        0: 'grade',
        1: 'geography',
        2: 'type',
        3: 'priceMin',
        4: 'priceMax'
    }
};
//    <<< Индексы полей, их имен и указателей фильтров fieldEditorPopup