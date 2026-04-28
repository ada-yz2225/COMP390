import pandas as pd

OPERATORS = {
    ">": "gt",
    "<": "lt",
    ">=": "ge",
    "<=": "le",
    "==": "eq"
}


def filter_dataframe(df, filters) -> pd.DataFrame:
    # Condition here
    query_strs = []

    for i, f in enumerate(filters):
        column = f["columnName"]
        operator = f["operator"]
        value = f["value"]

        if operator in OPERATORS:
            condition = f"({column} {operator} {value})"
        else:
            raise Exception(f"Unsupported operator: {operator}")

        if i > 0:
            logic = filters[i-1]["logic"].lower()
            query_strs.append(logic)
        query_strs.append(condition)

    query_expr = " ".join(query_strs)
    filtered_df = df.query(query_expr) if query_strs else df
    if filtered_df.empty:
        raise ValueError(f"Filtered dataframe is empty")
    print(filtered_df)
    return filtered_df
