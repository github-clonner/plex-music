import _ from "lodash";
import React from "react";
import { findDOMNode } from "react-dom";
import mousetrap from "mousetrap";
import MediaQuery from "react-responsive";

import { action, observable } from "mobx";
import { inject, observer } from "mobx-react";
import { theme } from "ui/theming";

import { MdSearch, MdClear } from "react-icons/md";

import { Text, Frame, Spinner, Gutter, FauxInput } from "ui";

@theme("filterGroup")
@inject("albumStore")
@observer
export default class FilterGroup extends React.Component {
  @observable isFocused = false;

  componentDidMount() {
    mousetrap.bind("command+f", this.focusInput);
  }

  componentWillUnmount() {
    mousetrap.unbind("command+f", this.focusInput);
  }

  focusInput = () => {
    this.input.focus();
    this.input.select();
  };

  onKeyDown(e) {
    if (e.key === "Escape") {
      e.target.blur();
    }
  }

  @action.bound
  setIsFocused(value) {
    this.isFocused = value;
  }

  setInput = el => {
    this.input = findDOMNode(el);
  };

  render() {
    const { style, focusStyle, albumStore } = this.props;
    const shouldDisplayClearIcon = !_.isEmpty(albumStore.query);

    return (
      <Frame
        style={{
          flex: 3,
          outline: "none",
          borderRadius: "2px",
          alignItems: "center",
          padding: "0 8px",
          ...style,
          ...(this.isFocused && focusStyle)
        }}
        onClick={this.focusInput}
      >
        {albumStore.isFiltering ? (
          <Spinner size={18} />
        ) : (
          <MdSearch size={18} />
        )}
        <Gutter size={8} />
        <FauxInput
          ref={this.setInput}
          placeholder="Search..."
          style={{ flex: "auto" }}
          value={albumStore.query}
          onKeyDown={this.onKeyDown}
          onChange={e => {
            albumStore.setQuery(e.target.value);
          }}
          onFocus={() => {
            this.setIsFocused(true);
          }}
          onBlur={() => {
            this.setIsFocused(false);
          }}
        />
        <MediaQuery minWidth={1200}>
          <div>
            <Gutter />
            <Text muted italic size={12} style={{ whiteSpace: "nowrap" }}>
              {albumStore.matches.length} albums(s)
            </Text>
          </div>
        </MediaQuery>
        {shouldDisplayClearIcon && <Gutter />}
        {shouldDisplayClearIcon && (
          <MdClear
            style={{ cursor: "pointer" }}
            size={16}
            color="#888"
            onClick={albumStore.clearFilter}
          />
        )}
      </Frame>
    );
  }
}
