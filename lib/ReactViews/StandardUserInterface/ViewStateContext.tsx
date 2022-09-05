import React, { createContext, useContext } from "react";
import ViewState from "../../ReactViewModels/ViewState";
import TerriaError from "../../Core/TerriaError";

export const ViewStateContext = createContext<ViewState | undefined>(undefined);

export const ViewStateProvider: React.FC<{ viewState: ViewState }> = ({
  viewState,
  children
}) => (
  <ViewStateContext.Provider value={viewState}>
    {children}
  </ViewStateContext.Provider>
);

export const useViewState = () => {
  const viewState = useContext(ViewStateContext);
  if (!viewState)
    throw new TerriaError({ message: "ViewState is not defined!" });
  return viewState;
};

export const withViewState =
  <P extends WithViewState>(
    Component: React.ComponentType<P>
  ): React.FC<Omit<P, "viewState">> =>
  (props) =>
    (
      <ViewStateContext.Consumer>
        {(viewState) => {
          if (!viewState)
            throw new TerriaError({ message: "ViewState is not defined!" });
          return <Component {...(props as P)} viewState={viewState} />;
        }}
      </ViewStateContext.Consumer>
    );

export interface WithViewState {
  viewState: ViewState;
}
