import { action } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import ViewState from "../../ReactViewModels/ViewState";
import { useViewState } from "../StandardUserInterface/ViewStateContext";
import ModalPopup from "./ModalPopup";
import Tabs from "./Tabs";

export const ExplorerWindowElementName = "AddData";

export default observer<React.FC>(function ExplorerWindow() {
  const viewState = useViewState();

  const onClose = action(() => {
    viewState.closeCatalog();
    viewState.switchMobileView("nowViewing");
  });

  const onStartAnimatingIn = action(() => {
    viewState.explorerPanelAnimating = true;
  });

  const onDoneAnimatingIn = action(() => {
    viewState.explorerPanelAnimating = false;
  });

  const isVisible =
    !viewState.useSmallScreenInterface &&
    !viewState.hideMapUi &&
    viewState.explorerPanelIsVisible;

  return (
    <ModalPopup
      viewState={viewState}
      isVisible={isVisible}
      isTopElement={viewState.topElement === ExplorerWindowElementName}
      onClose={onClose}
      onStartAnimatingIn={onStartAnimatingIn}
      onDoneAnimatingIn={onDoneAnimatingIn}
    >
      <Tabs terria={viewState.terria} viewState={viewState} />
    </ModalPopup>
  );
});
