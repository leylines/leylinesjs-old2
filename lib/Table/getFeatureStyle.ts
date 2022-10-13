import Cartesian2 from "terriajs-cesium/Source/Core/Cartesian2";
import Color from "terriajs-cesium/Source/Core/Color";
import CesiumMath from "terriajs-cesium/Source/Core/Math";
import BillboardGraphics from "terriajs-cesium/Source/DataSources/BillboardGraphics";
import LabelGraphics from "terriajs-cesium/Source/DataSources/LabelGraphics";
import PathGraphics from "terriajs-cesium/Source/DataSources/PathGraphics";
import PointGraphics from "terriajs-cesium/Source/DataSources/PointGraphics";
import Property from "terriajs-cesium/Source/DataSources/Property";
import LabelStyle from "terriajs-cesium/Source/Scene/LabelStyle";
import { getMakiIcon, isMakiIcon } from "../Map/Icons/Maki/MakiIcons";
import TableStyle from "./TableStyle";
import { isConstantStyleMap } from "./TableStyleMap";

/** Type to exclude CesiumProperty types in a given Object.
 * For example:
 * ```ts
 * ExcludeCesiumProperty<{someKey: string | Property}>
 * => {someKey: string}
 * ```
 *
 * This is useful when creating style options for cesium primitives (eg `PointGraphics`, `LabelGraphics`, ...), as it means we can
 * - directly pass these options into cesium primitive constructors (eg `new PointGraphics(options)`) - which we do in `createLongitudeLatitudeFeaturePerRow`
 * - OR we can turn style options into `SampledProperty` or `TimeIntervalCollectionProperty`  - which is required for `createLongitudeLatitudeFeaturePerId`
 */
type ExcludeCesiumProperty<T> = {
  [key in keyof T]: Exclude<T[key], Property>;
};

// The following "Supported*" types contain all supported properties for different cesium primitives.
// The are used to transform TableStyleTraits into applicable constructor options for cesium primitives:
// - For example - TableLabelStyleTraits are transformed into LabelGraphics.ConstructorOptions - which follows the SupportedLabelGraphics type
// The `ExcludeCesiumProperty` is used here because all "*.ConstructorOptions" properties allow Cesium.Property values - which we don't want - we want the "raw" values (eg `string`, `Color`, ...).

export type SupportedPointGraphics = Pick<
  ExcludeCesiumProperty<PointGraphics.ConstructorOptions>,
  "color" | "outlineColor" | "pixelSize" | "outlineWidth"
>;

export type SupportedBillboardGraphics = Pick<
  ExcludeCesiumProperty<BillboardGraphics.ConstructorOptions>,
  "image" | "color" | "width" | "height" | "rotation" | "pixelOffset"
>;

export type SupportedPathGraphics = Pick<
  ExcludeCesiumProperty<PathGraphics.ConstructorOptions>,
  "leadTime" | "trailTime" | "width" | "resolution"
>;

export interface SupportedSolidColorMaterial {
  color: Color;
}
export interface SupportedPolylineGlowMaterial {
  color: Color;
  glowPower?: number;
  taperPower?: number;
}

export type SupportedLabelGraphics = Pick<
  ExcludeCesiumProperty<LabelGraphics.ConstructorOptions>,
  | "font"
  | "text"
  | "style"
  | "scale"
  | "fillColor"
  | "outlineColor"
  | "outlineWidth"
  | "pixelOffset"
>;

/** For given TableStyle and rowId, return feature styling in a "cesium-friendly" format.
 * It returns style options for the following
 * - PointGraphics (for point marker)
 * - BillboardGraphics (for custom marker)
 * - PathGraphics (referred to as "trail" in Traits system)
 * - LabelGraphics
 * - `usePointGraphics` flag - whether to use PointGraphics or BillboardGraphics for marker symbology
 */
export function getFeatureStyle(style: TableStyle, rowId: number) {
  // Convert TablePointStyleTraits, TableColorStyleTraits, TableOutlineStyleTraits and TablePointSizeStyleTraits into
  // - PointGraphics options
  // - BillboardGraphics options
  // - makiIcon SVG string (used in BillboardGraphics options)
  const color =
    style.colorMap.mapValueToColor(style.colorColumn?.valuesForType[rowId]) ??
    null;

  const pointSize =
    style.pointSizeColumn !== undefined
      ? style.pointSizeMap.mapValueToPointSize(
          style.pointSizeColumn.valueFunctionForType(rowId)
        )
      : undefined;

  const pointStyle = style.pointStyleMap.traits.enabled
    ? isConstantStyleMap(style.pointStyleMap.styleMap)
      ? style.pointStyleMap.styleMap.style
      : style.pointStyleMap.styleMap.mapValueToStyle(rowId)
    : undefined;

  const outlineStyle = style.outlineStyleMap.traits.enabled
    ? isConstantStyleMap(style.outlineStyleMap.styleMap)
      ? style.outlineStyleMap.styleMap.style
      : style.outlineStyleMap.styleMap.mapValueToStyle(rowId)
    : undefined;

  // If no outline color is defined in traits, use current basemap contrast color
  const outlineColor = outlineStyle
    ? Color.fromCssColorString(
        outlineStyle.color ?? style.tableModel.terria.baseMapContrastColor
      )
    : undefined;

  const pointGraphicsOptions:
    | ExcludeCesiumProperty<SupportedPointGraphics>
    | undefined = pointStyle
    ? {
        color: color,
        pixelSize: pointSize ?? pointStyle?.height ?? pointStyle?.width
      }
    : undefined;

  if (pointGraphicsOptions && outlineStyle && outlineColor) {
    pointGraphicsOptions.outlineWidth = outlineStyle.width;
    pointGraphicsOptions.outlineColor = outlineColor;
  }

  // This returns SVG string
  const makiIcon = pointStyle
    ? getMakiIcon(
        pointStyle.marker ?? "circle",
        color.toCssColorString(),
        outlineStyle?.width,
        outlineColor?.toCssColorString(),
        pointSize ?? pointStyle.height ?? 24,
        pointSize ?? pointStyle.width ?? 24
      )
    : undefined;

  const billboardGraphicsOptions: SupportedBillboardGraphics | undefined =
    pointStyle
      ? {
          image: makiIcon ?? pointStyle.marker,
          // Only add color property for non maki icons - as we color maki icons directly (see `makiIcon = getMakiIcon(...)`)
          color: !makiIcon ? color : Color.WHITE,
          width: pointSize ?? pointStyle.width,
          height: pointSize ?? pointStyle.height,
          // Convert clockwise degrees to counter-clockwise radians
          rotation: CesiumMath.toRadians(360 - (pointStyle.rotation ?? 0)),
          pixelOffset: new Cartesian2(
            pointStyle.pixelOffset?.[0],
            pointStyle.pixelOffset?.[1]
          )
        }
      : undefined;

  // Convert TableTrailStyleTraits into PathGraphics options
  // We also have two supported materials
  // - PolylineGlowMaterialTraits -> PolylineGlowMaterial options
  // - SolidColorMaterialTraits -> ColorMaterialProperty options
  const trailStyle = style.trailStyleMap.traits.enabled
    ? isConstantStyleMap(style.trailStyleMap.styleMap)
      ? style.trailStyleMap.styleMap.style
      : style.trailStyleMap.styleMap.mapValueToStyle(rowId)
    : undefined;

  const pathGraphicsOptions: SupportedPathGraphics | undefined = trailStyle;

  const pathGraphicsSolidColorOptions: SupportedSolidColorMaterial | undefined =
    trailStyle?.solidColor
      ? {
          color: Color.fromCssColorString(trailStyle.solidColor.color)
        }
      : undefined;

  const pathGraphicsPolylineGlowOptions:
    | SupportedPolylineGlowMaterial
    | undefined = trailStyle?.polylineGlow
    ? {
        ...trailStyle.polylineGlow,
        color: Color.fromCssColorString(trailStyle.polylineGlow.color)
      }
    : undefined;

  // Convert TableLabelStyleTraits to LabelGraphics options
  const labelStyle = style.labelStyleMap.traits.enabled
    ? isConstantStyleMap(style.labelStyleMap.styleMap)
      ? style.labelStyleMap.styleMap.style
      : style.labelStyleMap.styleMap.mapValueToStyle(rowId)
    : undefined;

  const labelGraphicsOptions: SupportedLabelGraphics | undefined = labelStyle
    ? {
        ...labelStyle,
        text: style.tableModel.tableColumns.find(
          (col) => col.name === labelStyle.labelColumn
        )?.values[rowId],
        style:
          labelStyle.style === "OUTLINE"
            ? LabelStyle.OUTLINE
            : labelStyle.style === "FILL_AND_OUTLINE"
            ? LabelStyle.FILL_AND_OUTLINE
            : LabelStyle.FILL,
        fillColor: Color.fromCssColorString(labelStyle.fillColor),
        outlineColor: Color.fromCssColorString(labelStyle.outlineColor),
        pixelOffset: new Cartesian2(
          labelStyle.pixelOffset[0],
          labelStyle.pixelOffset[1]
        )
      }
    : undefined;

  return {
    labelGraphicsOptions,
    pointGraphicsOptions,
    pathGraphicsOptions,
    pathGraphicsSolidColorOptions,
    pathGraphicsPolylineGlowOptions,
    billboardGraphicsOptions,
    /** Use PointGraphics instead of BillboardGraphics, if not using maki icon. */
    usePointGraphics: !isMakiIcon(pointStyle?.marker)
  };
}
