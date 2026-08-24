import { TextField, Button, Icon } from "@bosch/react-frok";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./SearchCreateReimbursementBtns.scss";

interface SearchCreateReimbursementBtnsProps {
  setSearchValue: (value: string) => void;
  searchValue: string;
  showCreateReimbursementBtn?: boolean;
}

function SearchCreateReimbursementBtns({
  setSearchValue,
  searchValue,
  showCreateReimbursementBtn = true,
}: Readonly<SearchCreateReimbursementBtnsProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();

  return (
    <>
      <div className="search-field">
        <TextField
          as="div"
          id="search"
          type="search"
          placeholder={t("search")}
          searchButton={{
            title: t("search"),
            "aria-label": t("search"),
          }}
          resetButton={{
            title: t("clear"),
            "aria-label": t("clear"),
            onClick: () => setSearchValue(""),
          }}
          name="search"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
          value={searchValue}
        />
      </div>
      {showCreateReimbursementBtn && (
        <Button
          className="create-reimbursement-btn"
          onClick={() => {
            navigate("/create-reimbursement");
          }}
        >
          <Icon iconName="add" />
          {t("createReimbursement")}
        </Button>
      )}
    </>
  );
}

export default SearchCreateReimbursementBtns;
