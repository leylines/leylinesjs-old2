import {
  computed,
  makeObservable,
  observable,
  override,
  runInAction
} from "mobx";
import CesiumTerrainProvider from "terriajs-cesium/Source/Core/CesiumTerrainProvider";
import IonResource from "terriajs-cesium/Source/Core/IonResource";
import TerriaError from "../../../Core/TerriaError";
import CatalogMemberMixin from "../../../ModelMixins/CatalogMemberMixin";
import MappableMixin from "../../../ModelMixins/MappableMixin";
import UrlMixin from "../../../ModelMixins/UrlMixin";
import CesiumTerrainCatalogItemTraits from "../../../Traits/TraitsClasses/CesiumTerrainCatalogItemTraits";
import CreateModel from "../../Definition/CreateModel";
import { ModelConstructorParameters } from "../../Definition/Model";

export default class CesiumTerrainCatalogItem extends UrlMixin(
  MappableMixin(CatalogMemberMixin(CreateModel(CesiumTerrainCatalogItemTraits)))
) {
  static type = "cesium-terrain";

  /**
   * An observable terrain provider instance set by forceLoadMapItems()
   */
  @observable
  private terrainProvider: CesiumTerrainProvider | undefined = undefined;

  constructor(...args: ModelConstructorParameters) {
    super(...args);
    makeObservable(this);
  }

  get type() {
    return CesiumTerrainCatalogItem.type;
  }

  @override
  get disableZoomTo() {
    return true;
  }

  @computed
  private get isTerrainActive() {
    return this.terria.terrainProvider === this.terrainProvider;
  }

  @override
  get shortReport() {
    if (super.shortReport === undefined) {
      const status = this.isTerrainActive ? "In use" : "Not in use";
      return `Terrain status: ${status}`;
    }
    return super.shortReport;
  }

  /**
   * Returns a Promise to load the terrain provider
   */
  private async loadTerrainProvider(): Promise<
    CesiumTerrainProvider | undefined
  > {
    const resource =
      this.ionAssetId !== undefined
        ? IonResource.fromAssetId(this.ionAssetId, {
            accessToken:
              this.ionAccessToken ||
              this.terria.configParameters.cesiumIonAccessToken,
            server: this.ionServer
          })
        : this.url;

    if (resource === undefined) {
      return undefined;
    }

    const terrainProvider = new CesiumTerrainProvider({
      url: resource,
      credit: this.attribution
    });

    // Some network errors are not rejected through readyPromise, so we have to
    // listen to them using the error event and dispose it later
    let networkErrorListener: (err: any) => void;
    const networkErrorPromise = new Promise((_resolve, reject) => {
      networkErrorListener = reject;
      terrainProvider.errorEvent.addEventListener(networkErrorListener);
    });

    const isReady = await Promise.race([
      networkErrorPromise,
      terrainProvider.readyPromise
    ])
      .catch(() => false)
      .finally(() =>
        terrainProvider.errorEvent.removeEventListener(networkErrorListener)
      );

    return isReady
      ? terrainProvider
      : Promise.reject(TerriaError.from("Failed to load terrain provider"));
  }

  protected async forceLoadMapItems(): Promise<void> {
    const terrainProvider = await this.loadTerrainProvider();
    runInAction(() => {
      this.terrainProvider = terrainProvider;
    });
  }

  @computed
  get mapItems() {
    return this.show && this.terrainProvider ? [this.terrainProvider] : [];
  }
}
