import { Tab, TabNavigation } from "@bosch/react-frok";
import { Form, Formik } from "formik";
import GenericAction from "../../generics/Action/GenericAction";
import GenericSection from "../../generics/Section/GenericSection";
import GenericForm from "../../generics/Form/GenericForm.types";

interface OverviewContentProps {
  form: GenericForm | null;
  selectedTab: string;
  tabs: { name: string; label: string; position: number }[];
  onTabSelect: (tabName: string) => void;
  initialFormValues: Record<string, unknown>;
  validate: (values: Record<string, unknown>) => void | Record<string, unknown>;
  formKey?: string;
  onEditSection: (sectionName: string) => void;
  currentStatus: string;
  onActionClick: (actionName: string) => void;
}

function OverviewContent({
  form,
  selectedTab,
  tabs,
  onTabSelect,
  initialFormValues,
  validate,
  formKey,
  onEditSection,
  currentStatus,
  onActionClick,
}: Readonly<OverviewContentProps>) {
  return (
    <>
      <TabNavigation
        className="sticky-tab-navigation"
        selectedValue={selectedTab || tabs[0]?.name}
        onTabSelect={(_, data) => onTabSelect(data.value as string)}
      >
        {tabs.map((tab) => (
          <Tab key={`${tab.name}_${tab.position}`} as={"a"} href={`#${tab.name}`} value={tab.name}>
            {tab.label}
          </Tab>
        ))}
      </TabNavigation>
      <Formik
        initialValues={initialFormValues}
        validate={validate}
        onSubmit={() => {}}
        enableReinitialize={true}
        validateOnBlur={false}
        key={formKey}
      >
        {() => (
          <Form>
            {form?.sections
              .filter((section) => section.name === selectedTab)
              .map((section) => (
                <GenericSection
                  key={section.name}
                  section={section}
                  onEdit={() => onEditSection(section.name)}
                />
              ))}
            <GenericAction
              actions={form?.actions || []}
              onActionClick={(actionName) => {
                if (!actionName) return;
                onActionClick(actionName);
              }}
              currentStatus={currentStatus}
            />
          </Form>
        )}
      </Formik>
    </>
  );
}

export default OverviewContent;
