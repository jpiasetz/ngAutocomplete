'use strict';

/**
 * A directive for adding google places autocomplete to a text box
 * google places autocomplete info: https://developers.google.com/maps/documentation/javascript/places
 *
 * Usage:
 *
 * <input type="text"  ng-autocomplete ng-model="autocomplete" options="options" details="details/>
 *
 * + ng-model - autocomplete textbox value
 *
 * + details - more detailed autocomplete result, includes address parts, latlng, etc. (Optional)
 *
 * + options - configuration for the autocomplete (Optional)
 *
 *       + types: type,        String, values can be 'geocode', 'establishment', '(regions)', or '(cities)'
 *       + bounds: bounds,     Google maps LatLngBounds Object, biases results to bounds, but may return results outside these bounds
 *       + country: country    String, ISO 3166-1 Alpha-2 compatible country code. examples; 'ca', 'us', 'gb'
 *       + watchEnter:         Boolean, true; on Enter select top autocomplete result. false(default); enter ends autocomplete
 *
 * example:
 *
 *    options = {
 *        types: '(cities)',
 *        country: 'ca'
 *    }
**/

angular.module('ngAutocomplete', [])
  .directive('ngAutocomplete', function($window) {
    return {
      require: 'ngModel',
      scope: {
        ngModel: '=',
        options: '=?',
        details: '=?'
      },

      link: function(scope, element, attrs, controller) {
        var cb = function () {
          scope.gPlace = new google.maps.places.Autocomplete(element[0], {});

          google.maps.event.addListener(scope.gPlace, 'place_changed', function() {
            var result = scope.gPlace.getPlace() || false;
            if (result && result.address_components !== undefined) {
              scope.$apply(function() {
                scope.details = result;
                controller.$setViewValue(element.val());
              });
            } else if (result && watchEnter) {
              getPlace(result);
            }
          });
        };

        var watchEnter = false;


        if ($window.google) {
          cb();
        } else {
          $window.ngAutocompleteCallback = cb;
          var tag = angular.element('<script></script>');
          tag[0].src ='https://maps.googleapis.com/maps/api/js?libraries=places&callback=ngAutocompleteCallback';
          if (scope.options && scope.options.googleApiKey) {
            tag[0].src += '&key=' + scope.options.googleApiKey;
          }
          element.append(tag);
        }

        var initOpts = function(options) {
          options = angular.extend({
            bounds: null,
            country: null,
            types: ''
          }, options);

          if (options) {
            watchEnter = options.watchEnter === true;

            var componentRestrictions = null;
            if (options.country) {
              componentRestrictions = {
                country: options.country
              };
            }
            if (scope.gPlace !== undefined) {
              scope.gPlace.setTypes([options.types]);
              scope.gPlace.setBounds(options.bounds);
              scope.gPlace.setComponentRestrictions(componentRestrictions);
            }
          }
        };

        //function to get retrieve the autocompletes first result using the AutocompleteService
        var getPlace = function(result) {
          var autocompleteService = new google.maps.places.AutocompleteService();
          if (result.name.length > 0){
            autocompleteService.getPlacePredictions(
              {
                input: result.name,
                offset: result.name.length
              },
              function listentoresult(list) {
                if(list === null || list.length === 0) {
                  scope.$apply(function() {
                    scope.details = null;
                  });
                } else {
                  var placesService = new google.maps.places.PlacesService(element[0]);
                  placesService.getDetails(
                    {'reference': list[0].reference},
                    function detailsresult(detailsResult, placesServiceStatus) {
                      var formattedAddress = detailsResult.formatted_address;

                      if (placesServiceStatus === google.maps.GeocoderStatus.OK) {
                        scope.$apply(function() {
                          controller.$setViewValue(formattedAddress);
                          element.val(formattedAddress);

                          scope.details = detailsResult;

                          //on focusout the value reverts, need to set it again.
                          element.on('focusout', function() {
                            element.val(formattedAddress);
                            element.unbind('focusout');
                          });

                        });
                      }
                    }
                  );
                }
              });
          }
        };

        controller.$render = function () {
          var location = controller.$viewValue;
          element.val(location);
        };

        //watch options provided to directive
        scope.watchOptions = function () {
          return scope.options;
        };
        scope.$watch(scope.watchOptions, initOpts, true);
      }
    };
  });
