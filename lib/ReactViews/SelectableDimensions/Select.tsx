import i18next from "i18next";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import ReactSelect from "react-select";
import ReactSelectCreatable from "react-select/creatable";
import { useTheme } from "styled-components";
import CommonStrata from "../../Models/Definition/CommonStrata";
import { SelectableDimensionEnum as SelectableDimensionEnumModel } from "../../Models/SelectableDimensions/SelectableDimensions";

export const SelectableDimensionEnum: React.FC<{
  id: string;
  dim: SelectableDimensionEnumModel;
}> = observer(({ id, dim }) => {
  const theme = useTheme();

  const undefinedOption = {
    value: undefined,
    label:
      dim.undefinedLabel ??
      i18next.t("workbench.dimensionsSelector.undefinedLabel")
  };

  let options = dim.options?.map((option) => ({
    value: option.id,
    label: option.name ?? option.id
  }));

  const selectedOption = dim.selectedId
    ? options?.find((option) => option.value === dim.selectedId)
    : undefinedOption;

  if (!options) return null;

  if (typeof dim.selectedId === "undefined" || dim.allowUndefined) {
    options = [undefinedOption, ...options];
  }

  return dim.allowCustomInput ? (
    <ReactSelectCreatable
      css={`
        color: ${theme.dark};
      `}
      options={options}
      value={selectedOption}
      onChange={(evt) => {
        runInAction(() =>
          dim.setDimensionValue(CommonStrata.user, evt?.value ?? "")
        );
      }}
      isClearable={dim.allowUndefined}
      formatOptionLabel={dim.optionRenderer}
      theme={(selectTheme) => ({
        ...selectTheme,
        colors: {
          ...selectTheme.colors,
          primary25: theme.greyLighter,
          primary50: theme.colorPrimary,
          primary75: theme.colorPrimary,
          primary: theme.colorPrimary
        }
      })}
    />
  ) : (
    <ReactSelect
      css={`
        color: ${theme.dark};
      `}
      options={options}
      value={selectedOption}
      onChange={(evt) => {
        runInAction(() =>
          dim.setDimensionValue(CommonStrata.user, evt?.value ?? "")
        );
      }}
      isClearable={dim.allowUndefined}
      formatOptionLabel={dim.optionRenderer}
      theme={(selectTheme) => ({
        ...selectTheme,
        colors: {
          ...selectTheme.colors,
          primary25: theme.greyLighter,
          primary50: theme.colorPrimary,
          primary75: theme.colorPrimary,
          primary: theme.colorPrimary
        }
      })}
    />
  );
});
