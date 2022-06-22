"use strict";

import classNames from "classnames";
import createReactClass from "create-react-class";
import { observer } from "mobx-react";
import PropTypes from "prop-types";
import React from "react";
import { Trans, withTranslation } from "react-i18next";
import defined from "terriajs-cesium/Source/Core/defined";
import Clipboard from "../../../Clipboard";
import IncludeStoryOption from "./IncludeStoryOption";
import Icon from "../../../../Styled/Icon";
import Loader from "../../../Loader";
import MenuPanel from "../../../StandardUserInterface/customizable/MenuPanel";
import Input from "../../../../Styled/Input";
import DropdownStyles from "../panel.scss";
import {
  buildShareLink,
  buildShortShareLink,
  canShorten,
  isShareable
} from "./BuildShareLink";
import Styles from "./share-panel.scss";
import StorySharePanel from "./StorySharePanel";
import {
  Category,
  ShareAction
} from "../../../../Core/AnalyticEvents/analyticEvents";

import { downloadImg } from "./Print/PrintView";
import { reaction } from "mobx";
import Checkbox from "../../../../Styled/Checkbox";
import Text from "../../../../Styled/Text";

const SharePanel = observer(
  createReactClass({
    displayName: "SharePanel",

    propTypes: {
      terria: PropTypes.object,
      userPropWhiteList: PropTypes.array,
      shortenUrls: PropTypes.bool,
      storyShare: PropTypes.bool,
      catalogShare: PropTypes.bool,
      catalogShareWithoutText: PropTypes.bool,
      modalWidth: PropTypes.number,
      viewState: PropTypes.object.isRequired,
      onUserClick: PropTypes.func,
      btnDisabled: PropTypes.bool,
      t: PropTypes.func.isRequired
    },

    getInitialState() {
      return {
        isOpen: false,
        shortenUrls:
          !!this.props.shortenUrls &&
          this.props.terria.getLocalProperty("shortenShareUrls"),
        shareUrl: "",
        isDownloading: false,
        advancedIsOpen: false
      };
    },

    componentDidMount() {
      if (this.props.terria.configParameters.interceptBrowserPrint) {
        window.addEventListener("beforeprint", this.beforeBrowserPrint, false);
        window.addEventListener("afterprint", this.afterBrowserPrint, false);

        const handlePrintMediaChange = evt => {
          if (evt.matches) {
            this.beforeBrowserPrint();
          } else {
            this.afterBrowserPrint();
          }
        };

        if (window.matchMedia) {
          const matcher = window.matchMedia("print");
          matcher.addListener(handlePrintMediaChange);
          this._unsubscribeFromPrintMediaChange = function() {
            matcher.removeListener(handlePrintMediaChange);
          };
        }

        this._oldPrint = window.print;
        window.print = () => {
          this.print();
        };
      }

      // Listen to the includeStoryInShare property of viewState, generate the share URL again if this changes
      // This allows the share URL to be updated when users change the 'Include Story in Share?'checkbox in the SharePanel comnponent.
      this.updateShareUrlWhenStoryOptionChanged = reaction(
        () => this.props.viewState.includeStoryInShare,
        () => {
          this.updateForShortening();
        }
      );
    },

    componentWillUnmount() {
      window.removeEventListener("beforeprint", this.beforeBrowserPrint, false);
      window.removeEventListener("afterprint", this.afterBrowserPrint, false);
      if (this._unsubscribeFromPrintMediaChange) {
        this._unsubscribeFromPrintMediaChange();
      }

      if (this._oldPrint) {
        window.print = this._oldPrint;
      }

      // Cleanup reaction
      this.updateShareUrlWhenStoryOptionChanged();
    },

    beforeBrowserPrint() {
      const { t } = this.props;
      this.afterBrowserPrint();
      this._message = document.createElement("div");
      this._message.innerText = t("share.browserPrint", {
        appName: this.props.terria.appName
      });
      window.document.body.insertBefore(
        this._message,
        window.document.body.childNodes[0]
      );
    },

    afterBrowserPrint() {
      if (this._message) {
        window.document.body.removeChild(this._message);
        this._message = undefined;
      }
      this.changeOpenState(true);
    },

    advancedIsOpen() {
      return this.state.advancedIsOpen;
    },

    toggleAdvancedOptions(e) {
      this.setState(prevState => ({
        advancedIsOpen: !prevState.advancedIsOpen
      }));
    },

    updateForShortening() {
      const { t } = this.props;
      this.setState({
        shareUrl: ""
      });

      if (this.shouldShorten()) {
        this.setState({
          placeholder: t("share.shortLinkShortening")
        });
        buildShortShareLink(this.props.terria, this.props.viewState, {
          includeStories:
            this.props.storyShare || this.props.viewState.includeStoryInShare
        })
          .then(shareUrl => this.setState({ shareUrl }))
          .catch(() => {
            this.setUnshortenedUrl();
            this.setState({
              errorMessage: t("share.shortLinkError")
            });
          });
      } else {
        this.setUnshortenedUrl();
      }
    },

    setUnshortenedUrl() {
      this.setState({
        shareUrl: buildShareLink(this.props.terria, this.props.viewState, {
          includeStories:
            this.props.storyShare || this.props.viewState.includeStoryInShare
        })
      });
    },

    isUrlShortenable() {
      return canShorten(this.props.terria);
    },

    shouldShorten() {
      const localStoragePref = this.props.terria.getLocalProperty(
        "shortenShareUrls"
      );

      return (
        this.isUrlShortenable() &&
        (localStoragePref || !defined(localStoragePref))
      );
    },

    onShortenClicked(e) {
      if (this.shouldShorten()) {
        this.props.terria.setLocalProperty("shortenShareUrls", false);
      } else if (this.isUrlShortenable()) {
        this.props.terria.setLocalProperty("shortenShareUrls", true);
      } else {
        return;
      }

      this.updateForShortening();
      this.forceUpdate();
    },

    changeOpenState(open) {
      this.setState({
        isOpen: open
      });

      if (open) {
        this.updateForShortening();
        if (this.props.catalogShare || this.props.storyShare) {
          this.props.viewState.shareModalIsVisible = true;
        }
      }
    },

    getShareUrlInput(theme) {
      return (
        <Input
          className={Styles.shareUrlfield}
          light={theme === "light"}
          dark={theme === "dark"}
          large
          type="text"
          value={this.state.shareUrl}
          placeholder={this.state.placeholder}
          readOnly
          onClick={e => e.target.select()}
          id="share-url"
        />
      );
    },

    getShareUrlInputStory(theme) {
      return (
        <Input
          className={Styles.shareUrlfield}
          light={theme === "light"}
          dark={theme === "dark"}
          large
          type="text"
          value={this.state.shareUrl}
          placeholder={this.state.placeholder}
          readOnly
          onClick={e => e.target.select()}
          id="share-url"
          css={`
            border-radius: 32px 0 0 32px;
          `}
        />
      );
    },

    onAddWebDataClicked() {
      this.setState({
        isOpen: false
      });
      this.props.viewState.openUserData();
    },

    hasUserAddedData() {
      return this.props.terria.catalog.userAddedDataGroup.members.length > 0;
    },

    renderWarning() {
      const unshareableItems = this.props.terria.catalog.userAddedDataGroup.memberModels.filter(
        model => !isShareable(this.props.terria)(model.uniqueId)
      );

      return (
        <If condition={unshareableItems.length > 0}>
          <div className={Styles.warning}>
            <Trans i18nKey="share.localDataNote">
              <p className={Styles.paragraph}>
                <strong>Note:</strong>
              </p>
              <p className={Styles.paragraph}>
                The following data sources will NOT be shared because they
                include data from this local system. To share these data
                sources, publish their data on a web server and{" "}
                <a
                  className={Styles.warningLink}
                  onClick={this.onAddWebDataClicked}
                >
                  add them using a url
                </a>
                .
              </p>
            </Trans>
            <ul className={Styles.paragraph}>
              {unshareableItems.map((item, i) => {
                return (
                  <li key={i}>
                    <strong>{item.name}</strong>
                  </li>
                );
              })}
            </ul>
          </div>
        </If>
      );
    },

    renderContent() {
      if (this.props.catalogShare) {
        return this.renderContentForCatalogShare();
      } else if (this.props.storyShare) {
        return this.renderContentForStoryShare();
      } else {
        return this.renderContentWithPrintAndEmbed();
      }
    },

    renderContentForStoryShare() {
      const { t, terria } = this.props;

      return (
        <Choose>
          <When condition={this.state.shareUrl === ""}>
            <Loader message={t("share.generatingUrl")} />
          </When>
          <Otherwise>
            <div className={Styles.clipboardForCatalogShare}>
              <Clipboard
                theme="dark"
                text={this.state.shareUrl}
                source={this.getShareUrlInputStory("light")}
                id="share-url"
                rounded
                onCopy={text =>
                  terria.analytics?.logEvent(
                    Category.share,
                    ShareAction.storyCopy,
                    text
                  )
                }
              />
              {this.renderWarning()}
            </div>
          </Otherwise>
        </Choose>
      );
    },

    renderContentForCatalogShare() {
      const { t, terria } = this.props;
      return (
        <Choose>
          <When condition={this.state.shareUrl === ""}>
            <Loader message={t("share.generatingUrl")} />
          </When>
          <Otherwise>
            <div className={Styles.clipboardForCatalogShare}>
              <Clipboard
                theme="light"
                text={this.state.shareUrl}
                source={this.getShareUrlInput("light")}
                id="share-url"
                onCopy={text =>
                  terria.analytics?.logEvent(
                    Category.share,
                    ShareAction.catalogCopy,
                    text
                  )
                }
              />
              {this.renderWarning()}
            </div>
          </Otherwise>
        </Choose>
      );
    },

    renderContentWithPrintAndEmbed() {
      const { t, terria, viewState } = this.props;
      const iframeCode = this.state.shareUrl.length
        ? `<iframe style="width: 720px; height: 600px; border: none;" src="${this.state.shareUrl}" allowFullScreen mozAllowFullScreen webkitAllowFullScreen></iframe>`
        : "";
      const bookMarkHelpItemName = "bookmarkHelp";

      return (
        <div>
          <div className={DropdownStyles.section}>
            <Clipboard
              source={this.getShareUrlInput("dark")}
              id="share-url"
              onCopy={text =>
                terria.analytics?.logEvent(
                  Category.share,
                  ShareAction.shareCopy,
                  text
                )
              }
            />
            {/* Following code block dependent on existence of "bookmarkHelp" Help Menu Item */}
            {this.props.terria.configParameters.helpContent.some(
              e => e.itemName === bookMarkHelpItemName
            ) && (
              <Text
                medium
                textLight
                isLink
                onClick={evt =>
                  viewState.openHelpPanelItemFromSharePanel(
                    evt,
                    bookMarkHelpItemName
                  )
                }
              >
                <div
                  className={classNames(
                    Styles.explanation,
                    Styles.getShareSaveHelpText
                  )}
                >
                  {t("share.getShareSaveHelpMessage")}
                </div>
              </Text>
            )}

            {this.renderWarning()}
          </div>
          <hr className={Styles.thinLineDivider} />
          <div className={DropdownStyles.section}>
            <div>{t("share.printTitle")}</div>
            <div className={Styles.explanation}>
              {t("share.printExplanation")}
            </div>
            <div>
              <button
                className={Styles.printButton}
                disabled={this.state.isDownloading}
                onClick={() => {
                  this.setState({
                    isDownloading: true
                  });
                  this.props.terria.currentViewer
                    .captureScreenshot()
                    .then(dataString => {
                      downloadImg(dataString);
                    })
                    .finally(() =>
                      this.setState({
                        isDownloading: false
                      })
                    );
                }}
              >
                {t("share.downloadMap")}
              </button>
              <button
                className={Styles.printButton}
                onClick={() => {
                  const newWindow = window.open();
                  this.props.viewState.setPrintWindow(newWindow);
                }}
              >
                {t("share.printViewButton")}
              </button>
            </div>
          </div>
          <hr className={Styles.thinLineDivider} />
          <div
            className={classNames(DropdownStyles.section, Styles.shortenUrl)}
          >
            <div className={Styles.btnWrapper}>
              <button
                type="button"
                onClick={this.toggleAdvancedOptions}
                className={Styles.btnAdvanced}
              >
                <span>{t("share.btnAdvanced")}</span>
                {this.advancedIsOpen() ? (
                  <Icon glyph={Icon.GLYPHS.opened} />
                ) : (
                  <Icon glyph={Icon.GLYPHS.closed} />
                )}
              </button>
            </div>
            <If condition={this.advancedIsOpen()}>
              <div className={DropdownStyles.section}>
                <p className={Styles.paragraph}>{t("share.embedTitle")}</p>
                <Input
                  large
                  dark
                  className={Styles.field}
                  type="text"
                  readOnly
                  placeholder={this.state.placeholder}
                  value={iframeCode}
                  onClick={e => e.target.select()}
                />
              </div>
              <If condition={this.isUrlShortenable()}>
                <div className={Styles.shortenUrl}>
                  <Checkbox
                    textProps={{ small: true }}
                    id="shortenUrl"
                    isChecked={this.shouldShorten() ?? false}
                    onChange={this.onShortenClicked}
                    className={Styles.checkbox}
                  ></Checkbox>
                  <p>{t("share.shortenUsingService")}</p>
                </div>
              </If>
              <IncludeStoryOption viewState={this.props.viewState} />
            </If>
          </div>
        </div>
      );
    },

    renderDownloadFormatButton(format) {
      return (
        <button
          key={format.name}
          className={Styles.formatButton}
          onClick={this.download}
        >
          {format.name}
        </button>
      );
    },

    openWithUserClick() {
      if (this.props.onUserClick) {
        this.props.onUserClick();
      }
      this.changeOpenState();
      this.renderContentForStoryShare();
    },

    render() {
      const { t } = this.props;
      const {
        catalogShare,
        storyShare,
        catalogShareWithoutText,
        modalWidth
      } = this.props;
      const dropdownTheme = {
        btn: classNames({
          [Styles.btnCatalogShare]: catalogShare,
          [Styles.btnStoryShare]: storyShare,
          [Styles.btnWithoutText]: catalogShareWithoutText
        }),
        outer: classNames(Styles.sharePanel, {
          [Styles.catalogShare]: catalogShare,
          [Styles.storyShare]: storyShare
        }),
        inner: classNames(Styles.dropdownInner, {
          [Styles.catalogShareInner]: catalogShare,
          [Styles.storyShareInner]: storyShare
        }),
        icon: "share"
      };

      const btnText = catalogShare
        ? t("share.btnCatalogShareText")
        : storyShare
        ? t("share.btnStoryShareText")
        : t("share.btnMapShareText");
      const btnTitle = catalogShare
        ? t("share.btnCatalogShareTitle")
        : storyShare
        ? t("share.btnStoryShareTitle")
        : t("share.btnMapShareTitle");

      return !storyShare ? (
        <MenuPanel
          theme={dropdownTheme}
          btnText={catalogShareWithoutText ? null : btnText}
          viewState={this.props.viewState}
          btnTitle={btnTitle}
          isOpen={this.state.isOpen}
          onOpenChanged={this.changeOpenState}
          showDropdownAsModal={catalogShare}
          modalWidth={modalWidth}
          smallScreen={this.props.viewState.useSmallScreenInterface}
          onDismissed={() => {
            if (catalogShare) this.props.viewState.shareModalIsVisible = false;
          }}
          onUserClick={this.props.onUserClick}
          disableCloseOnFocusLoss={this.props.viewState.retainSharePanel}
        >
          <If condition={this.state.isOpen}>{this.renderContent()}</If>
        </MenuPanel>
      ) : (
        <StorySharePanel
          btnText={catalogShareWithoutText ? null : btnText}
          viewState={this.props.viewState}
          btnTitle={btnTitle}
          isOpen={this.state.isOpen}
          onOpenChanged={this.changeOpenState}
          showDropdownAsModal={storyShare}
          modalWidth={modalWidth}
          smallScreen={this.props.viewState.useSmallScreenInterface}
          btnDisabled={this.props.btnDisabled}
          onDismissed={() => {
            if (storyShare) this.props.viewState.shareModalIsVisible = false;
          }}
          onUserClick={this.props.onUserClick}
        >
          <If condition={this.state.isOpen}>{this.renderContent()}</If>
        </StorySharePanel>
      );
    }
  })
);

export default withTranslation()(SharePanel);
