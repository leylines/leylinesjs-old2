"use strict";

import { observer } from "mobx-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import MenuPanel from "../../../StandardUserInterface/customizable/MenuPanel";
import { useViewState } from "../../../StandardUserInterface/ViewStateContext";
import DropdownStyles from "../panel.scss";
import CountDatasets from "./CountDatasets";
import Styles from "./tools-panel.scss";

const ToolsPanel = observer(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [resultsMessage, setResultsMessage] = useState("");
  const dropdownTheme = {
    btn: Styles.btnShare,
    outer: Styles.ToolsPanel,
    inner: Styles.dropdownInner,
    icon: "settings"
  };
  const { t } = useTranslation();
  const viewState = useViewState();
  return (
    <MenuPanel
      theme={dropdownTheme}
      btnText={t("toolsPanel.btnText")}
      viewState={viewState}
      btnTitle={t("toolsPanel.btnTitle")}
      onOpenChanged={setIsOpen}
      isOpen={isOpen}
      smallScreen={viewState.useSmallScreenInterface}
    >
      <If condition={isOpen}>
        <div className={DropdownStyles.section}>
          <div className={Styles.this}>
            <CountDatasets updateResults={setResultsMessage} />
          </div>
        </div>
      </If>
      <div className={Styles.results}>
        <div dangerouslySetInnerHTML={{ __html: resultsMessage }} />
      </div>
    </MenuPanel>
  );
});

export default ToolsPanel;
