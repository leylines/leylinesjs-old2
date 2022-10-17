import classNames from "classnames";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import PropTypes from "prop-types";
import React from "react";
import styled from "styled-components";
import withControlledVisibility from "../../ReactViews/HOCs/withControlledVisibility";
import { useViewState } from "../StandardUserInterface/ViewStateContext";
import HelpButton from "./HelpButton/HelpButton";
import LangPanel from "./Panels/LangPanel/LangPanel";
import SettingPanel from "./Panels/SettingPanel";
import SharePanel from "./Panels/SharePanel/SharePanel";
import ToolsPanel from "./Panels/ToolsPanel/ToolsPanel";
import StoryButton from "./StoryButton/StoryButton";

import Styles from "./menu-bar.scss";

const StyledMenuBar = styled.div`
  pointer-events: none;
  ${(p) =>
    p.trainerBarVisible &&
    `
    top: ${Number(p.theme.trainerHeight) + Number(p.theme.mapButtonTop)}px;
  `}
`;
// The map navigation region
const MenuBar = observer((props) => {
  const viewState = useViewState();
  const terria = viewState.terria;
  const menuItems = props.menuItems || [];
  const handleClick = () => {
    runInAction(() => {
      viewState.topElement = "MenuBar";
    });
  };

  const storyEnabled = terria.configParameters.storyEnabled;
  const enableTools = terria.userProperties.get("tools") === "1";

  return (
    <StyledMenuBar
      className={classNames(
        viewState.topElement === "MenuBar" ? "top-element" : "",
        Styles.menuBar,
        {
          [Styles.menuBarWorkbenchClosed]: viewState.isMapFullScreen
        }
      )}
      onClick={handleClick}
      trainerBarVisible={viewState.trainerBarVisible}
    >
      <section>
        <ul className={classNames(Styles.menu)}>
          {enableTools && (
            <li className={Styles.menuItem}>
              <ToolsPanel />
            </li>
          )}
          <If condition={!viewState.useSmallScreenInterface}>
            <For each="element" of={props.menuLeftItems} index="i">
              <li className={Styles.menuItem} key={i}>
                {element}
              </li>
            </For>
          </If>
        </ul>
      </section>
      <section className={classNames(Styles.flex)}>
        <ul className={classNames(Styles.menu)}>
          <li className={Styles.menuItem}>
            <SettingPanel terria={terria} viewState={viewState} />
          </li>
          <li className={Styles.menuItem}>
            <HelpButton viewState={viewState} />
          </li>

          {terria.configParameters?.languageConfiguration?.enabled ? (
            <li className={Styles.menuItem}>
              <LangPanel
                terria={terria}
                smallScreen={viewState.useSmallScreenInterface}
              />
            </li>
          ) : null}
        </ul>
        <If condition={storyEnabled}>
          <ul className={classNames(Styles.menu)}>
            <li className={Styles.menuItem}>
              <StoryButton
                terria={terria}
                viewState={viewState}
                theme={props.theme}
              />
            </li>
          </ul>
        </If>
        <ul className={classNames(Styles.menu)}>
          <li className={Styles.menuItem}>
            <SharePanel
              terria={terria}
              viewState={viewState}
              animationDuration={props.animationDuration}
            />
          </li>
        </ul>
        <If condition={!viewState.useSmallScreenInterface}>
          <For each="element" of={menuItems} index="i">
            <li className={Styles.menuItem} key={i}>
              {element}
            </li>
          </For>
        </If>
      </section>
    </StyledMenuBar>
  );
});
MenuBar.displayName = "MenuBar";
MenuBar.propTypes = {
  animationDuration: PropTypes.number,
  menuItems: PropTypes.arrayOf(PropTypes.element),
  menuLeftItems: PropTypes.arrayOf(PropTypes.element)
};

export default withControlledVisibility(MenuBar);
