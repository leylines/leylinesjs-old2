import { action } from "mobx";
import Cartesian2 from "terriajs-cesium/Source/Core/Cartesian2";
import JulianDate from "terriajs-cesium/Source/Core/JulianDate";
import Resource from "terriajs-cesium/Source/Core/Resource";
import ConstantProperty from "terriajs-cesium/Source/DataSources/ConstantProperty";
import PropertyBag from "terriajs-cesium/Source/DataSources/PropertyBag";
import ImageryProvider from "terriajs-cesium/Source/Scene/ImageryProvider";
import Constructor from "../Core/Constructor";
import isDefined from "../Core/isDefined";
import loadJson from "../Core/loadJson";
import proxyCatalogItemUrl from "../Models/Catalog/proxyCatalogItemUrl";
import Model from "../Models/Definition/Model";
import Feature from "../Models/Feature";
import { describeFromProperties } from "../ReactViews/FeatureInfo/FeatureInfoSection";
import FeatureInfoUrlTemplateTraits from "../Traits/TraitsClasses/FeatureInfoTraits";
import MappableMixin from "./MappableMixin";
import TimeVarying from "./TimeVarying";

type Target = Model<FeatureInfoUrlTemplateTraits>;

function FeatureInfoUrlTemplateMixin<T extends Constructor<Target>>(Base: T) {
  abstract class FeatureInfoUrlTemplateMixin extends Base {
    get hasFeatureInfoUrlTemplateMixin() {
      return true;
    }
    /**
     * Returns a {@link Feature} for the pick result.
     */
    abstract buildFeatureFromPickResult(
      screenPosition: Cartesian2 | undefined,
      pickResult: any
    ): Feature | undefined;

    /**
     * Returns a {@link Feature} for the pick result. If `featureInfoUrlTemplate` is set,
     * it asynchronously loads additional info from the url.
     */
    @action
    getFeaturesFromPickResult(
      screenPosition: Cartesian2 | undefined,
      pickResult: any,
      loadExternal = true
    ): Feature | undefined {
      const feature = this.buildFeatureFromPickResult(
        screenPosition,
        pickResult
      );
      if (isDefined(feature)) {
        feature._catalogItem = this;

        (async () => {
          if (loadExternal && isDefined(this.featureInfoUrlTemplate)) {
            const resource = new Resource({
              url: proxyCatalogItemUrl(this, this.featureInfoUrlTemplate, "0d"),
              templateValues: feature.properties
                ? feature.properties.getValue(new JulianDate())
                : undefined
            });
            try {
              const featureInfo = await loadJson(resource);
              Object.keys(featureInfo).forEach((property) => {
                if (!feature.properties) {
                  feature.properties = new PropertyBag();
                }
                feature.properties.addProperty(property, featureInfo[property]);
              });
              // Update description of the feature after it is resolved from
              // feature info template url
              feature.description = new ConstantProperty(
                describeFromProperties(
                  feature.properties,
                  (TimeVarying.is(this)
                    ? this.currentTimeAsJulianDate
                    : undefined) ?? JulianDate.now(),
                  MappableMixin.isMixedInto(this)
                    ? this.showStringIfPropertyValueIsNull
                    : false
                )
              );
            } catch (e) {
              if (!feature.properties) {
                feature.properties = new PropertyBag();
              }
              feature.properties.addProperty(
                "Error",
                "Unable to retrieve feature details from:\n\n" + resource.url
              );
            }
          }
        })();
      }
      return feature;
    }

    wrapImageryPickFeatures<T extends ImageryProvider>(imageryProvider: T) {
      const realPickFeatures = imageryProvider.pickFeatures;
      const catalogItem = this;
      imageryProvider.pickFeatures = async (
        x: number,
        y: number,
        level: number,
        longitude: number,
        latitude: number
      ) => {
        const features = await realPickFeatures.call(
          imageryProvider,
          x,
          y,
          level,
          longitude,
          latitude
        );
        if (
          isDefined(catalogItem.featureInfoUrlTemplate) &&
          isDefined(features) &&
          features.length < catalogItem.maxRequests
        ) {
          for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            const resource = new Resource({
              url: proxyCatalogItemUrl(
                catalogItem,
                catalogItem.featureInfoUrlTemplate,
                "0d"
              ),
              templateValues: feature.properties
                ? feature.properties
                : undefined
            });
            try {
              const featureInfo = await loadJson(resource);
              Object.keys(featureInfo).forEach((property) => {
                if (!feature.properties) {
                  feature.properties = {};
                }
                if (feature.properties instanceof PropertyBag) {
                  feature.properties.addProperty(
                    property,
                    featureInfo[property]
                  );
                } else {
                  feature.properties[property] = featureInfo[property];
                }
              });
              // Update description of the feature after it is resolved from
              // feature info template url
              feature.description = describeFromProperties(
                feature.properties,
                (TimeVarying.is(catalogItem)
                  ? catalogItem.currentTimeAsJulianDate
                  : undefined) ?? JulianDate.now(),
                MappableMixin.isMixedInto(catalogItem)
                  ? catalogItem.showStringIfPropertyValueIsNull
                  : false
              );
            } catch (e) {
              if (!feature.properties) {
                feature.properties = {};
              }
              feature.properties["Error"] =
                "Unable to retrieve feature details from:\n\n" + resource.url;
            }
          }
        }
        return Promise.resolve(features!);
      };
      return imageryProvider;
    }
  }
  return FeatureInfoUrlTemplateMixin;
}

namespace FeatureInfoUrlTemplateMixin {
  export interface Instance
    extends InstanceType<ReturnType<typeof FeatureInfoUrlTemplateMixin>> {}
  export function isMixedInto(model: any): model is Instance {
    return model && model.hasFeatureInfoUrlTemplateMixin;
  }
}

export default FeatureInfoUrlTemplateMixin;
