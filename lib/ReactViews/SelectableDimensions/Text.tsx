import { runInAction } from "mobx";
import React from "react";
import CommonStrata from "../../Models/Definition/CommonStrata";
import { SelectableDimensionText as SelectableDimensionTextModel } from "../../Models/SelectableDimensions/SelectableDimensions";
import Input from "../../Styled/Input";

export const SelectableDimensionText: React.FC<{
  id: string;
  dim: SelectableDimensionTextModel;
}> = ({ id, dim }) => {
  return (
    <Input
      styledHeight={"34px"}
      light
      border
      name={id}
      value={dim.value}
      onChange={(evt) => {
        runInAction(() =>
          dim.setDimensionValue(CommonStrata.user, evt.target.value)
        );
      }}
    />
  );
};
