import dash
from dash import dcc, html, dash_table
from dash.dependencies import Input, Output
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
import os

# Carica i dati
constructor_standings = pd.read_csv('constructor_standings.csv')
constructors = pd.read_csv('constructors.csv')
races = pd.read_csv('races.csv')
seasons = pd.read_csv('seasons.csv')

# Merge dei dati
data = constructor_standings.merge(races[['raceId', 'year', 'round', 'name']], on='raceId')
data = data.merge(constructors[['constructorId', 'name', 'constructorRef']], on='constructorId', suffixes=('', '_constructor'))

# Rinomina le colonne per chiarezza
data.rename(columns={'name': 'race_name', 'name_constructor': 'constructor_name'}, inplace=True)

# Colori personalizzati per i team
team_colors = {
    'Mercedes': '#00D2BE',
    'Ferrari': '#DC0000',
    'Red Bull': '#0600EF',
    'McLaren': '#FF8700',
    'Alpine F1 Team': '#0090FF',
    'AlphaTauri': '#2B4562',
    'Aston Martin': '#006F62',
    'Williams': '#005AFF',
    'Alfa Romeo': '#900000',
    'Haas F1 Team': '#FFFFFF',
    'Racing Point': '#F596C8',
    'Renault': '#FFF500',
    'Toro Rosso': '#469BFF',
    'Force India': '#F596C8',
    'Sauber': '#9B0000',
    'Lotus F1': '#FFB800',
    'Manor Marussia': '#6E0000',
    'Caterham': '#005030',
    'Marussia': '#6E0000',
    'HRT': '#b8babd',
    'Virgin': '#cc0000',
    'Brawn': '#b4ba00',
    'Toyota': '#cc0000',
    'BMW Sauber': '#0066cc',
    'Honda': '#ffffff',
    'Super Aguri': '#ffffff',
    'Spyker': '#ff6600',
    'MF1': '#cc0000',
    'Jordan': '#ffcc00',
    'Midland F1 Racing': '#ff0000',
    'BAR': '#ffffff',
    'Minardi': '#000000',
    'Jaguar': '#006633',
    'Arrows': '#ff9900',
    'Prost': '#0000ff',
    'Benetton': '#6cedb5',
    'Stewart': '#ffffff',
    'Tyrrell': '#0000ff',
    'Lola': '#ff0000',
    'Forti': '#ffff00',
    'Pacific': '#0099cc',
    'Simtek': '#862992',
    'Footwork': '#ff00ff',
    'Larrousse': '#0000ff',
    'March': '#ff0000',
    'Dallara': '#ff0000',
    'Andrea Moda': '#000000',
    'Fondmetal': '#6e1a46',
    'AGS': '#0000ff',
    'Coloni': '#ffff00',
    'EuroBrun': '#ff0000',
    'Life': '#b2945e',
    'Rial': '#0099ff',
    'Zakspeed': '#ffffff',
    'Spirit': '#ffffff',
    'Toleman': '#0000ff',
    'Osella': '#ff0000',
    'Ligier': '#0033cc',
    'Theodore': '#ffffff',
    'Ensign': '#ff0000',
    'Shadow': '#000000',
    'Boro': '#ff0000',
    'Kauhsen': '#ff0000',
    'Rebaque': '#ffd700',
    'Hesketh': '#ffffff',
    'Amon': '#ff0000',
    'Token': '#ffd700',
    'Tecno': '#808080',
    'Brabham': '#005030',
    'Surtees': '#ffffff',
    'Embassy Hill': '#ff0000',
    'Fittipaldi': '#ffd700',
    'Wolf': '#0000ff',
    'March Engineering': '#ff0000',
    'McGuire': '#ff0000',
    'BRM': '#005030',
    'Penske': '#ffd700',
    'LEC': '#ff0000',
    'Trojan': '#ff0000',
    'Eifelland': '#ff0000',
    'Parnelli': '#ff0000',
    'ISO Marlboro': '#ff0000',
    'Team Lotus': '#ffb800',
    'De Tomaso': '#ff0000',
    'Politoys': '#ffffff',
    'Team Gunston': '#ff9900',
    'Motor Racing Developments': '#005030',
    'Bellasi': '#ffd700',
    'LDS': '#ff0000',
    'ENB': '#ff0000',
    'Shannon': '#0000ff',
    'RAM': '#ffffff',
    'Merzario': '#ff0000',
    'Connew': '#ffffff',
    'Apollon': '#ff9900',
    'Lyncar': '#0000ff',
    'BS Fabrications': '#ff0000',
    'ATS': '#ff0000',
    'Kojima': '#ffffff',
    'Maki': '#ff9900',
    'Hill': '#ffffff',
    'Onyx': '#000000',
    'AGS JH': '#0000ff',
    'Rial Racing': '#0099ff',
    'Scuderia Italia': '#ff0000',
    'EuroBrun Racing': '#ff0000',
    'Auto Technisches Spezialteam': '#ff0000',
    'Modena': '#ffff00',
    'Scuderia Coloni': '#ffff00',
    'Andrea Moda Formula': '#000000',
    'Luxembourg Racing Team': '#0000ff',
    'Venturi': '#0000ff',
    'Venturi Automobiles': '#0000ff',
    'Fondmetal Fomet': '#6e1a46',
    'ATS Wheels': '#ff0000',
    'RAM Racing': '#ffffff',
    'Spirit Racing': '#ffffff',
    'Theodore Racing': '#ffffff',
    'Hesketh Racing': '#ffffff',
    'Embassy Hill Racing': '#ff0000',
    'Martini': '#ffffff',
    'Shadow Racing': '#000000',
    'Penske Racing': '#ffd700',
    'Tecno Racing': '#808080',
    'Iso Marlboro': '#ff0000',
    'BRM P201': '#005030',
    'LDS Mk1': '#ff0000',
    'Team Surtees': '#ffffff',
    'Fittipaldi Automotive': '#ffd700',
    'Wolf Racing': '#0000ff',
    'Token Racing': '#ffd700',
    'BS Fabrications McLaren': '#ff0000',
    'Team Rebaque': '#ffd700',
    'Team Haas': '#FFFFFF',
    'Osella Squadra Corse': '#ff0000',
    'Minardi Team': '#000000',
    'AGS Moteurs JH': '#0000ff',
    'Automobiles Gonfaronnaises Sportives': '#0000ff',
    'Jordan Grand Prix': '#ffcc00',
    'Andrea Moda': '#000000',
    'Scuderia Larrousse': '#0000ff',
    'BMS Scuderia Italia': '#ff0000',
    'MasterCard Lola': '#ff0000',
    'Pacific Racing': '#0099cc',
    'Simtek Grand Prix': '#862992',
    'MTV Simtek Ford': '#862992',
    'Benetton Formula': '#6cedb5',
    'Mild Seven Benetton Renault': '#6cedb5',
    'Stewart Grand Prix': '#ffffff',
    'Red Bull Racing': '#0600EF',
    'BMW Sauber F1 Team': '#0066cc',
    'Toyota Racing': '#cc0000',
    'MF1 Racing': '#cc0000',
    'Spyker F1': '#ff6600',
    'Super Aguri F1': '#ffffff',
    'Midland F1': '#ff0000',
    'Honda Racing F1': '#ffffff',
    'Force India F1 Team': '#F596C8',
    'Virgin Racing': '#cc0000',
    'Hispania Racing': '#b8babd',
    'Lotus Racing': '#FFB800',
    'Marussia F1 Team': '#6E0000',
    'Caterham F1 Team': '#005030',
    'Marussia Manor Racing': '#6E0000',
    'Manor F1 Team': '#6E0000',
    'Haas F1': '#FFFFFF',
    'Toro Rosso Honda': '#469BFF',
    'Alfa Romeo Racing': '#900000',
    'Rich Energy Haas F1 Team': '#FFFFFF',
    'Scuderia Toro Rosso': '#469BFF',
    'Scuderia Ferrari': '#DC0000',
    'Sahara Force India F1 Team': '#F596C8',
    'Sahara Force India': '#F596C8',
    'Sauber F1 Team': '#9B0000',
    'Renault Sport F1 Team': '#FFF500',
    'Renault F1 Team': '#FFF500',
    'Aston Martin F1 Team': '#006F62',
    'Alpine Renault': '#0090FF',
    'Scuderia AlphaTauri': '#2B4562',
    'Scuderia AlphaTauri Honda': '#2B4562',
    'Alfa Romeo F1 Team': '#900000',
    'Alfa Romeo F1 Team ORLEN': '#900000',
    'Uralkali Haas F1 Team': '#FFFFFF',
    'Aston Martin Aramco F1 Team': '#006F62',
    'BWT Alpine F1 Team': '#0090FF',
    'Oracle Red Bull Racing': '#0600EF',
    'Mercedes-AMG Petronas F1 Team': '#00D2BE',
    'Aston Martin Aramco Cognizant F1 Team': '#006F62',
    'MoneyGram Haas F1 Team': '#FFFFFF',
    'Visa Cash App RB F1 Team': '#2B4562',
    'Kick Sauber F1 Team': '#52E252',
    'RB F1 Team': '#2B4562',
    'Stake F1 Team Kick Sauber': '#52E252'
}

# Inizializza l'app Dash
app = dash.Dash(__name__)
server = app.server  

# Layout dell'app
app.layout = html.Div([
    # Header
    html.Div([
        html.H1("Constructor Standings - Formula 1", 
                style={'color': '#ffffff', 'margin': '0', 'fontSize': '2.5rem', 'fontWeight': '700'}),
        html.P("Explore the evolution of team performances race by race", 
               style={'color': '#cccccc', 'margin': '0', 'fontSize': '1.1rem'})
    ], style={
        'backgroundColor': '#15151e',
        'padding': '2rem',
        'textAlign': 'center',
        'borderBottom': '3px solid #ff1801'
    }),
    
    # Main Container
    html.Div([
        # Season Selector
        html.Div([
            html.Label("Select Season", style={'color': '#ffffff', 'fontWeight': '600', 'fontSize': '1.1rem'}),
            dcc.Dropdown(
                id='season-dropdown',
                options=[{'label': str(year), 'value': year} for year in sorted(seasons['year'].unique(), reverse=True)],
                value=max(seasons['year']),
                style={
                    'backgroundColor': '#2a2a3e',
                    'color': '#ffffff',
                    'border': 'none',
                    'marginTop': '0.5rem'
                },
                className='custom-dropdown'
            )
        ], style={'margin': '2rem 0'}),
        
        # Charts Container
        html.Div([
            # Line Chart
            dcc.Graph(id='line-chart', style={'height': '600px'}),
            
            # Final Standings Table
            html.Div([
                html.H3("Final Standings", style={'color': '#ffffff', 'marginBottom': '1rem', 'fontWeight': '600'}),
                html.Div(id='standings-table')
            ], style={'marginTop': '3rem'})
        ])
    ], style={
        'backgroundColor': '#1a1a2e',
        'padding': '2rem',
        'minHeight': '100vh'
    })
], style={
    'fontFamily': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'backgroundColor': '#1a1a2e',
    'margin': '0',
    'padding': '0'
})

# Callback per aggiornare il grafico e la tabella
@app.callback(
    [Output('line-chart', 'figure'),
     Output('standings-table', 'children')],
    [Input('season-dropdown', 'value')]
)
def update_dashboard(selected_year):
    # Filtra i dati per l'anno selezionato
    year_data = data[data['year'] == selected_year].copy()
    
    # Ordina per round
    year_data.sort_values(['round', 'position'], inplace=True)
    
    # I punti nel dataset sono già cumulativi, non serve calcolarli
    # Crea il grafico a linee
    fig = go.Figure()
    
    # Ottieni la classifica finale per ordinare le linee
    if not year_data.empty:
        final_round = year_data['round'].max()
        final_standings = year_data[year_data['round'] == final_round].copy()
        final_standings.sort_values('points', ascending=False, inplace=True)
        
        # Aggiungi una linea per ogni costruttore
        for constructor in final_standings['constructor_name'].unique():
            constructor_data = year_data[year_data['constructor_name'] == constructor].copy()
            constructor_data.sort_values('round', inplace=True)
            
            # Usa il colore personalizzato se disponibile, altrimenti usa un colore di default
            color = team_colors.get(constructor, '#888888')
            
            fig.add_trace(go.Scatter(
                x=constructor_data['round'],
                y=constructor_data['points'],  # Usa direttamente i punti dal dataset
                mode='lines+markers',
                name=constructor,
                line=dict(width=3, color=color, shape='spline'),
                marker=dict(size=8, color=color),
                hovertemplate='<b>%{fullData.name}</b><br>' +
                              'Round %{x}<br>' +
                              'Points: %{y}<br>' +
                              '<extra></extra>'
            ))
    
    # Personalizza il layout del grafico
    fig.update_layout(
        title=dict(
            text=f'Constructor Championship {selected_year}',
            font=dict(size=24, color='white', family='Inter'),
            x=0.5,
            xanchor='center'
        ),
        xaxis=dict(
            title=dict(
                text='Race Round',
                font=dict(size=14, color='white')
            ),
            tickfont=dict(size=12, color='white'),
            gridcolor='#3a3a4e',
            showgrid=True,
            dtick=1
        ),
        yaxis=dict(
            title=dict(
                text='Cumulative Points',
                font=dict(size=14, color='white')
            ),
            tickfont=dict(size=12, color='white'),
            gridcolor='#3a3a4e',
            showgrid=True
        ),
        plot_bgcolor='#1a1a2e',
        paper_bgcolor='#1a1a2e',
        hovermode='x unified',
        legend=dict(
            orientation="v",
            yanchor="top",
            y=0.98,
            xanchor="left",
            x=1.02,
            font=dict(size=12, color='white'),
            bgcolor='rgba(26, 26, 46, 0.8)',
            bordercolor='#3a3a4e',
            borderwidth=1
        ),
        margin=dict(l=50, r=200, t=80, b=50)
    )
    
    # Crea la tabella finale
    if not year_data.empty:
        # Prendi solo i dati dell'ultima gara per la classifica finale
        final_round = year_data['round'].max()
        final_standings_table = year_data[year_data['round'] == final_round][['constructor_name', 'points', 'position']].copy()
        final_standings_table.sort_values('position', inplace=True)
        final_standings_table.columns = ['Team', 'Points', 'Position']
        final_standings_table = final_standings_table[['Position', 'Team', 'Points']]
        
        # Crea la tabella Dash
        table = dash_table.DataTable(
            data=final_standings_table.to_dict('records'),
            columns=[{"name": i, "id": i} for i in final_standings_table.columns],
            style_cell={
                'backgroundColor': '#2a2a3e',
                'color': 'white',
                'border': '1px solid #3a3a4e',
                'textAlign': 'left',
                'padding': '12px',
                'fontSize': '14px'
            },
            style_header={
                'backgroundColor': '#15151e',
                'fontWeight': 'bold',
                'border': '1px solid #3a3a4e',
                'fontSize': '16px'
            },
            style_data_conditional=[
                {
                    'if': {'row_index': 0},
                    'backgroundColor': '#ffd700',
                    'color': '#15151e',
                    'fontWeight': 'bold'
                },
                {
                    'if': {'row_index': 1},
                    'backgroundColor': '#c0c0c0',
                    'color': '#15151e',
                    'fontWeight': 'bold'
                },
                {
                    'if': {'row_index': 2},
                    'backgroundColor': '#cd7f32',
                    'color': '#15151e',
                    'fontWeight': 'bold'
                }
            ],
            style_table={
                'overflowX': 'auto',
                'border': '1px solid #3a3a4e',
                'borderRadius': '8px'
            }
        )
    else:
        table = html.Div("No data available for this season", style={'color': '#ffffff'})
    
    return fig, table

# CSS personalizzato
app.index_string = '''
<!DOCTYPE html>
<html>
    <head>
        {%metas%}
        <title>{%title%}</title>
        {%favicon%}
        {%css%}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body {
                margin: 0;
                padding: 0;
                background-color: #1a1a2e;
            }
            .custom-dropdown .Select-control {
                background-color: #2a2a3e !important;
                border: none !important;
            }
            .custom-dropdown .Select-value-label {
                color: white !important;
            }
            .custom-dropdown .Select-arrow {
                border-color: white transparent transparent !important;
            }
            .custom-dropdown .Select-menu-outer {
                background-color: #2a2a3e !important;
                border: 1px solid #3a3a4e !important;
            }
            .custom-dropdown .Select-option {
                background-color: #2a2a3e !important;
                color: white !important;
            }
            .custom-dropdown .Select-option.is-focused {
                background-color: #3a3a4e !important;
            }
            .custom-dropdown .Select-option.is-selected {
                background-color: #ff1801 !important;
            }
        </style>
    </head>
    <body>
        {%app_entry%}
        <footer>
            {%config%}
            {%scripts%}
            {%renderer%}
        </footer>
    </body>
</html>
'''

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8050)), debug=False)